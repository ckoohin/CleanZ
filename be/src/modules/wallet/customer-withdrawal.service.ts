import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { toNumber } from 'src/common/helpers/number.helper';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { WithdrawalStatus } from 'src/common/enums/with-drawal-status.enum';
import { CustomerEntity } from '../customer/entity/customer.entity';
import { MAX_WEEKLY_WITHDRAWALS } from '../finance/services/finance.service';
import { CustomerWithdrawalRequestEntity } from './entity/customer-withdrawal-request.entity';
import { WalletService } from './wallet.service';
import {
  CreateCustomerWithdrawalDto,
  ReviewCustomerWithdrawalDto,
} from './dto/customer-withdrawal.dto';

@Injectable()
export class CustomerWithdrawalService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
    @InjectRepository(CustomerWithdrawalRequestEntity)
    private readonly repo: Repository<CustomerWithdrawalRequestEntity>,
  ) {}

  /** Khách tạo yêu cầu rút. Reserve qua available = balance - pending (không hold ví). */
  async createRequest(
    userId: string,
    dto: CreateCustomerWithdrawalDto,
  ): Promise<CustomerWithdrawalRequestEntity> {
    return this.dataSource.transaction(async (manager) => {
      const customer = await this.findCustomer(manager, userId);
      const wallet = await this.walletService.getOrCreateCustomerWallet(
        manager,
        customer,
      );
      const reqRepo = manager.getRepository(CustomerWithdrawalRequestEntity);

      const weekly = await reqRepo
        .createQueryBuilder('w')
        .where('w.customer_id = :cid', { cid: customer.id })
        .andWhere('w.status IN (:...s)', {
          s: [
            WithdrawalStatus.PENDING,
            WithdrawalStatus.APPROVED,
            WithdrawalStatus.PROCESSED,
          ],
        })
        .andWhere(`DATE_TRUNC('week', w.created_at) = DATE_TRUNC('week', NOW())`)
        .getCount();
      if (weekly >= MAX_WEEKLY_WITHDRAWALS) {
        throw new BadRequestException(
          `Bạn chỉ được gửi tối đa ${MAX_WEEKLY_WITHDRAWALS} yêu cầu rút tiền mỗi tuần`,
        );
      }

      const pending = await reqRepo
        .createQueryBuilder('w')
        .select('COALESCE(SUM(w.amount),0)', 'total')
        .where('w.wallet_id = :wid', { wid: wallet.id })
        .andWhere('w.status = :st', { st: WithdrawalStatus.PENDING })
        .getRawOne<{ total: string }>();

      const amount = Number(dto.amount);
      const available = toNumber(wallet.balance) - toNumber(pending?.total ?? 0);
      if (amount > available) {
        throw new BadRequestException(
          `Số dư khả dụng không đủ. Có thể rút: ${available}`,
        );
      }

      const saved = await reqRepo.save(
        reqRepo.create({
          customerId: customer.id,
          walletId: wallet.id,
          amount,
          status: WithdrawalStatus.PENDING,
          bankAccount: dto.bankAccount,
          bankName: dto.bankName,
          note: dto.note ?? null,
        }),
      );
      return saved;
    });
  }

  async listMine(userId: string): Promise<CustomerWithdrawalRequestEntity[]> {
    const customer = await this.dataSource
      .getRepository(CustomerEntity)
      .findOne({ where: { user: { id: userId } } });
    if (!customer) return [];
    return this.repo.find({
      where: { customerId: customer.id },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async listAll(
    status?: WithdrawalStatus,
  ): Promise<CustomerWithdrawalRequestEntity[]> {
    return this.repo.find({
      where: status ? { status } : {},
      relations: ['customer', 'customer.user'],
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  /** Admin duyệt: APPROVE → trừ ví (WITHDRAW) + processedAt; REJECT → chỉ đổi trạng thái. */
  async review(
    id: string,
    dto: ReviewCustomerWithdrawalDto,
  ): Promise<CustomerWithdrawalRequestEntity> {
    return this.dataSource.transaction(async (manager) => {
      const reqRepo = manager.getRepository(CustomerWithdrawalRequestEntity);
      const request = await reqRepo.findOne({
        where: { id },
        relations: ['wallet'],
      });
      if (!request) throw new NotFoundException('Không tìm thấy yêu cầu rút');
      if (request.status !== WithdrawalStatus.PENDING) {
        throw new ConflictException(
          `Yêu cầu không ở trạng thái chờ (hiện: ${request.status})`,
        );
      }

      if (dto.status === WithdrawalStatus.APPROVED) {
        await this.walletService.debitWallet(manager, {
          wallet: request.wallet,
          amount: toNumber(request.amount),
          type: WalletTransactionType.WITHDRAW,
          referenceId: request.id,
          referenceType: 'CUSTOMER_WITHDRAWAL_REQUEST',
          description: `Khách rút về ${request.bankName ?? ''} - ${request.bankAccount ?? ''}`,
        });
      }

      await reqRepo.update(
        { id },
        {
          status: dto.status,
          adminNote: dto.adminNote ?? request.adminNote,
          proofImageUrl: dto.proofImageUrl ?? request.proofImageUrl,
          reviewedAt: new Date(),
          ...(dto.status === WithdrawalStatus.APPROVED
            ? { processedAt: new Date() }
            : {}),
        },
      );
      const updated = await reqRepo.findOne({ where: { id } });
      return updated!;
    });
  }

  private async findCustomer(
    manager: EntityManager,
    userId: string,
  ): Promise<CustomerEntity> {
    const customer = await manager
      .getRepository(CustomerEntity)
      .findOne({ where: { user: { id: userId } }, relations: ['user'] });
    if (!customer) throw new NotFoundException('Không tìm thấy hồ sơ khách hàng');
    return customer;
  }
}
