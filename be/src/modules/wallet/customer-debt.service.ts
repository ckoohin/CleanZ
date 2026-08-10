import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { toNumber } from 'src/common/helpers/number.helper';
import type { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import {
  CustomerDebtEntity,
  CustomerDebtSource,
  CustomerDebtStatus,
  customerDebtOutstanding,
} from './entity/customer-debt.entity';
import { WalletService } from './wallet.service';

export const CUSTOMER_DEBT_RECOVERY_REF = 'CUSTOMER_DEBT_RECOVERY';

export interface OpenCustomerDebtInput {
  customerId: string;
  source: CustomerDebtSource;
  sourceRefId: string;
  sourceCode?: string | null;
  amount: number;
}

export interface CustomerDebtRecoveryContext {
  /** Gắn bút toán vào booking đã tạo khoản credit để màn khách đối soát đúng số. */
  booking?: BookingEntity;
}

@Injectable()
export class CustomerDebtService {
  constructor(private readonly walletService: WalletService) {}

  async openDebt(
    manager: EntityManager,
    input: OpenCustomerDebtInput,
  ): Promise<CustomerDebtEntity | null> {
    const amount = Math.round(input.amount);
    const repo = manager.getRepository(CustomerDebtEntity);
    const existing = await repo.findOne({
      where: { source: input.source, sourceRefId: input.sourceRefId },
    });

    // Khoá nguồn nợ là idempotency key và số gốc là dữ liệu audit: retry không
    // được sửa/xoá một khoản đã ghi nhận, kể cả lần tính lại hiện tại ra 0.
    if (existing) return existing;
    if (amount <= 0) return null;

    const debt = repo.create({
      customer: { id: input.customerId } as CustomerEntity,
      source: input.source,
      sourceRefId: input.sourceRefId,
      recoveredAmount: 0,
      writtenOffAmount: 0,
    });
    debt.sourceCode = input.sourceCode ?? null;
    debt.originalAmount = amount;
    debt.status = this.resolveStatus(debt, amount);
    return repo.save(debt);
  }

  async getOutstandingForCustomer(
    manager: EntityManager,
    customerId: string,
  ): Promise<number> {
    const row = await manager
      .getRepository(CustomerDebtEntity)
      .createQueryBuilder('d')
      .select(
        'COALESCE(SUM(d.original_amount - d.recovered_amount - d.written_off_amount), 0)',
        'total',
      )
      .where('d.customer_id = :customerId', { customerId })
      .andWhere('d.status = :status', {
        status: CustomerDebtStatus.OUTSTANDING,
      })
      .andWhere('d.source = :source', {
        source: CustomerDebtSource.ABSENCE_COMPENSATION,
      })
      .getRawOne<{ total: string }>();
    return Math.max(0, toNumber(row?.total));
  }

  findBySource(
    manager: EntityManager,
    source: CustomerDebtSource,
    sourceRefId: string,
  ): Promise<CustomerDebtEntity | null> {
    return manager.getRepository(CustomerDebtEntity).findOne({
      where: { source, sourceRefId },
      relations: ['writtenOffByAdmin'],
    });
  }

  async recoverForCustomer(
    manager: EntityManager,
    customerId: string,
    maxRecoveryAmount?: number,
    context: CustomerDebtRecoveryContext = {},
  ): Promise<number> {
    const recoveryLimit =
      maxRecoveryAmount == null
        ? Number.POSITIVE_INFINITY
        : Math.max(0, Math.round(toNumber(maxRecoveryAmount)));
    if (recoveryLimit <= 0) return 0;

    const repo = manager.getRepository(CustomerDebtEntity);
    const debts = await repo
      .createQueryBuilder('d')
      .setLock('pessimistic_write', undefined, ['d'])
      .where('d.customer_id = :customerId', { customerId })
      .andWhere('d.status = :status', {
        status: CustomerDebtStatus.OUTSTANDING,
      })
      .andWhere('d.source = :source', {
        source: CustomerDebtSource.ABSENCE_COMPENSATION,
      })
      .orderBy('d.created_at', 'ASC')
      .getMany();
    if (debts.length === 0) return 0;

    const customer = await manager.getRepository(CustomerEntity).findOne({
      where: { id: customerId },
    });
    if (!customer) return 0;

    const customerWallet = await this.walletService.getOrCreateCustomerWallet(
      manager,
      customer,
    );
    let available = Math.min(
      Math.max(0, toNumber(customerWallet.balance)),
      recoveryLimit,
    );
    if (available <= 0) return 0;

    const systemWallet =
      await this.walletService.getOrCreateSystemWallet(manager);
    let totalRecovered = 0;

    for (const debt of debts) {
      if (available <= 0) break;
      const outstanding = customerDebtOutstanding(debt);
      if (outstanding <= 0) continue;

      const pay = Math.min(outstanding, available);
      const label = debt.sourceCode ?? debt.sourceRefId;
      await this.walletService.transfer(manager, {
        fromWallet: customerWallet,
        toWallet: systemWallet,
        amount: pay,
        debitType: WalletTransactionType.PAYMENT,
        creditType: WalletTransactionType.ADJUSTMENT,
        booking: context.booking,
        referenceId: debt.sourceRefId,
        referenceType: CUSTOMER_DEBT_RECOVERY_REF,
        description: `Tất toán công nợ Booking: ${label}`,
      });

      debt.recoveredAmount = toNumber(debt.recoveredAmount) + pay;
      debt.status = this.resolveStatus(debt, toNumber(debt.originalAmount));
      await repo.save(debt);
      available -= pay;
      totalRecovered += pay;
    }

    return totalRecovered;
  }

  async writeOff(
    manager: EntityManager,
    debtId: string,
    adminUserId: string | null,
    reason: string,
    minAgeDays: number,
  ): Promise<{ writtenOff: number; sourceCode: string | null }> {
    const trimmed = reason?.trim() ?? '';
    if (trimmed.length < 10) {
      throw new UnprocessableEntityException({
        code: 'WRITE_OFF_REASON_REQUIRED',
        message: 'Lý do xoá nợ phải có ít nhất 10 ký tự',
      });
    }

    const repo = manager.getRepository(CustomerDebtEntity);
    const debt = await repo
      .createQueryBuilder('d')
      .setLock('pessimistic_write', undefined, ['d'])
      .where('d.id = :debtId', { debtId })
      .getOne();
    if (!debt) {
      throw new NotFoundException({
        code: 'DEBT_NOT_FOUND',
        message: 'Không tìm thấy khoản nợ khách hàng',
      });
    }

    const outstanding = customerDebtOutstanding(debt);
    if (outstanding <= 0) {
      throw new ConflictException({
        code: 'NO_OUTSTANDING_DEBT',
        message: 'Khoản này không còn nợ để xoá',
      });
    }

    if (Date.now() - debt.createdAt.getTime() < minAgeDays * 86_400_000) {
      throw new ConflictException({
        code: 'WRITE_OFF_TOO_EARLY',
        message: `Chỉ được xoá nợ sau ${minAgeDays} ngày`,
      });
    }

    debt.writtenOffAmount = toNumber(debt.writtenOffAmount) + outstanding;
    debt.writtenOffAt = new Date();
    debt.writeOffReason = trimmed;
    debt.writtenOffByAdmin = adminUserId
      ? ({ id: adminUserId } as UserEntity)
      : null;
    debt.status = CustomerDebtStatus.WRITTEN_OFF;
    await repo.save(debt);
    return { writtenOff: outstanding, sourceCode: debt.sourceCode ?? null };
  }

  private resolveStatus(
    debt: CustomerDebtEntity,
    originalAmount: number,
  ): CustomerDebtStatus {
    const settled =
      toNumber(debt.recoveredAmount) + toNumber(debt.writtenOffAmount);
    if (settled < originalAmount) return CustomerDebtStatus.OUTSTANDING;
    return toNumber(debt.writtenOffAmount) > 0
      ? CustomerDebtStatus.WRITTEN_OFF
      : CustomerDebtStatus.RECOVERED;
  }
}
