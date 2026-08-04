import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { WithdrawalStatus } from 'src/common/enums/with-drawal-status.enum';
import { toNumber } from 'src/common/helpers/number.helper';

import { VN_NOW_SQL } from 'src/common/helpers/vietnam-time.helper';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CustomerEntity } from '../customer/entity/customer.entity';
import { BankListService } from './bank-list.service';
import {
  CreateCustomerWithdrawalDto,
  ReviewCustomerWithdrawalDto,
} from './dto/customer-withdrawal.dto';
import { CustomerWithdrawalRequestEntity } from './entity/customer-withdrawal-request.entity';
import { WalletEntity } from './entity/wallet.entity';
import { PayoutService } from './payout.service';
import { WalletService } from './wallet.service';

@Injectable()
export class CustomerWithdrawalService {
  private readonly logger = new Logger(CustomerWithdrawalService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
    private readonly payoutService: PayoutService,
    private readonly bankListService: BankListService,
    @InjectRepository(CustomerWithdrawalRequestEntity)
    private readonly repo: Repository<CustomerWithdrawalRequestEntity>,
  ) {}

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
      const limits = await this.walletService.getWithdrawalLimits(manager);

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
        .andWhere(
          `DATE_TRUNC('week', w.created_at) = DATE_TRUNC('week', ${VN_NOW_SQL})`,
        )
        .getCount();
      if (weekly >= limits.maxPerWeek) {
        throw new BadRequestException(
          `Bạn chỉ được gửi tối đa ${limits.maxPerWeek} yêu cầu rút tiền mỗi tuần`,
        );
      }

      const pending = await reqRepo
        .createQueryBuilder('w')
        .select('COALESCE(SUM(w.amount),0)', 'total')
        .where('w.wallet_id = :wid', { wid: wallet.id })
        .andWhere('w.status = :st', { st: WithdrawalStatus.PENDING })
        .getRawOne<{ total: string }>();

      const amount = Number(dto.amount);
      this.walletService.assertWithdrawalAmount(amount, limits);

      const available =
        toNumber(wallet.balance) - toNumber(pending?.total ?? 0);
      if (amount > available) {
        throw new BadRequestException(
          `Số dư khả dụng không đủ. Có thể rút: ${available}`,
        );
      }

      return reqRepo.save(
        reqRepo.create({
          customerId: customer.id,
          walletId: wallet.id,
          amount,
          status: WithdrawalStatus.PENDING,
          bankAccount: dto.bankAccount,
          bankName: dto.bankName,
          bankBin: dto.bankBin ?? null,
          note: dto.note ?? null,
        }),
      );
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

  /**
   * Admin review: 3-phase flow on APPROVE (mirror FinanceService.reviewWithdrawal).
   *
   * Phase 1 (DB transaction): lock row, debit wallet, mark APPROVED.
   * Phase 2 (outside tx): call PayOS Payout API — no DB lock held during HTTP.
   * Phase 3: success → PROCESSED + payosReferenceId; failure → credit wallet back, reset PENDING, throw 502.
   *
   * REJECT: single DB update, wallet untouched.
   */
  async review(
    id: string,
    dto: ReviewCustomerWithdrawalDto,
  ): Promise<CustomerWithdrawalRequestEntity> {
    if (dto.status === WithdrawalStatus.REJECTED) {
      return this.dataSource.transaction(async (manager) => {
        const reqRepo = manager.getRepository(CustomerWithdrawalRequestEntity);
        const request = await reqRepo.findOne({
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!request) throw new NotFoundException('Không tìm thấy yêu cầu rút');
        if (request.status !== WithdrawalStatus.PENDING) {
          throw new ConflictException(
            `Yêu cầu không ở trạng thái chờ (hiện: ${request.status})`,
          );
        }
        await reqRepo.update(
          { id },
          {
            status: WithdrawalStatus.REJECTED,
            adminNote: dto.adminNote ?? request.adminNote,
            proofImageUrl: dto.proofImageUrl ?? request.proofImageUrl,
            reviewedAt: new Date(),
          },
        );
        return (await reqRepo.findOne({ where: { id } }))!;
      });
    }

    // APPROVED path — 3 phases
    let snapshot: CustomerWithdrawalRequestEntity;

    // Phase 1: debit wallet, mark APPROVED
    this.logger.log(`Phase 1 bắt đầu: customerWithdrawalId=${id}`);
    await this.dataSource.transaction(async (manager) => {
      const reqRepo = manager.getRepository(CustomerWithdrawalRequestEntity);

      const request = await reqRepo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!request) throw new NotFoundException('Không tìm thấy yêu cầu rút');
      if (request.status !== WithdrawalStatus.PENDING) {
        throw new ConflictException(
          `Yêu cầu không ở trạng thái chờ (hiện: ${request.status})`,
        );
      }

      const wallet = await manager
        .getRepository(WalletEntity)
        .findOne({ where: { id: request.walletId } });
      if (!wallet) throw new NotFoundException('Không tìm thấy ví khách');

      await this.walletService.debitWallet(manager, {
        wallet,
        amount: toNumber(request.amount),
        type: WalletTransactionType.WITHDRAW,
        referenceId: request.id,
        referenceType: 'CUSTOMER_WITHDRAWAL_REQUEST',
        description: `Khách rút về ${request.bankName ?? ''} - ${request.bankAccount ?? ''}`,
      });

      await reqRepo.update(
        { id },
        {
          status: WithdrawalStatus.APPROVED,
          adminNote: dto.adminNote ?? request.adminNote,
          proofImageUrl: dto.proofImageUrl ?? request.proofImageUrl,
          reviewedAt: new Date(),
        },
      );

      snapshot = request;
      this.logger.log(
        `Phase 1 hoàn tất: customerWithdrawalId=${id}, ví ${wallet.id} đã trừ ${request.amount}`,
      );
    });

    // Phase 2: PayOS payout (outside transaction)
    let payosReferenceId: string;
    try {
      const resolvedBin = await this.resolveBin(
        snapshot!.bankBin,
        snapshot!.bankName,
      );
      this.logger.log(
        `Phase 2 bắt đầu: customerWithdrawalId=${id}, toBin=${resolvedBin}, toAccount=${snapshot!.bankAccount}`,
      );
      payosReferenceId = await this.payoutService.createSinglePayout({
        amount: toNumber(snapshot!.amount),
        description: `Rut ${id.slice(0, 19)}`,
        toBin: resolvedBin,
        toAccountNumber: snapshot!.bankAccount ?? '',
        category: ['CUSTOMER_WITHDRAWAL'],
      });
      this.logger.log(
        `Phase 2 thành công: customerWithdrawalId=${id}, payosReferenceId=${payosReferenceId}`,
      );
    } catch (err) {
      // Phase 3 rollback: credit wallet back, reset to PENDING
      this.logger.error(
        `Phase 2 thất bại — đang hoàn ví: customerWithdrawalId=${id}, err=${(err as Error).message}`,
      );
      try {
        await this.dataSource.transaction(async (manager) => {
          const wallet = await manager
            .getRepository(WalletEntity)
            .findOne({ where: { id: snapshot!.walletId } });
          if (wallet) {
            await this.walletService.creditWallet(manager, {
              wallet,
              amount: toNumber(snapshot!.amount),
              type: WalletTransactionType.ADJUSTMENT,
              referenceId: snapshot!.id,
              referenceType: 'CUSTOMER_WITHDRAWAL_ROLLBACK',
              description: `Hoàn ví do PayOS payout thất bại (customerWithdrawalId=${id})`,
            });
          }
          await manager
            .getRepository(CustomerWithdrawalRequestEntity)
            .update({ id }, { status: WithdrawalStatus.PENDING });
        });
        this.logger.log(`Hoàn ví thành công: customerWithdrawalId=${id}`);
      } catch (rollbackErr) {
        this.logger.error(
          `Hoàn ví thất bại — cần xử lý thủ công: customerWithdrawalId=${id}, err=${(rollbackErr as Error).message}`,
        );
      }
      throw new InternalServerErrorException((err as Error).message);
    }

    // Phase 3: mark PROCESSED
    await this.repo.update(
      { id },
      {
        status: WithdrawalStatus.PROCESSED,
        payosReferenceId,
        processedAt: new Date(),
      },
    );
    this.logger.log(
      `Phase 3 hoàn tất: customerWithdrawalId=${id} → PROCESSED, payosReferenceId=${payosReferenceId}`,
    );

    return (await this.repo.findOne({ where: { id } }))!;
  }

  private async resolveBin(
    bankBin: string | null,
    bankName: string | null,
  ): Promise<string> {
    if (bankBin) return bankBin;
    if (!bankName) return '';
    const banks = await this.bankListService.getBanks();
    const name = bankName.toLowerCase();
    const match = banks.find(
      (b) =>
        b.shortName.toLowerCase() === name ||
        b.name.toLowerCase().includes(name),
    );
    return match?.bin ?? '';
  }

  private async findCustomer(
    manager: EntityManager,
    userId: string,
  ): Promise<CustomerEntity> {
    const customer = await manager
      .getRepository(CustomerEntity)
      .findOne({ where: { user: { id: userId } }, relations: ['user'] });
    if (!customer)
      throw new NotFoundException('Không tìm thấy hồ sơ khách hàng');
    return customer;
  }
}
