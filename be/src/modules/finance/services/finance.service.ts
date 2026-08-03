import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { WithdrawalStatus } from 'src/common/enums/with-drawal-status.enum';
import { WalletTransactionListQueryDto } from 'src/modules/wallet/dto/wallet-transaction-list-query.dto';
import { PayoutService } from 'src/modules/wallet/payout.service';
import { WalletService } from 'src/modules/wallet/wallet.service';
import { DataSource } from 'typeorm';
import { WalletTransactionType } from '../../../common/enums/wallet-transaction-type.enum';
import { PaginatedData } from '../../../common/helpers/response.interface';
import { User } from '../../users/entities/user.entity';

import { WalletTransactionEntity } from '../../wallet/entity/wallet-transaction.entity';
import { WalletEntity } from '../../wallet/entity/wallet.entity';
import { CustomerSpendingQueryDto } from '../dto/customer-spending-query.dto';
import { ManualAdjustmentDto } from '../dto/manual-adjustment.dto';

import { RevenueQueryDto } from '../dto/revenue-query.dto';
import { RevenueSummaryResponseDto } from '../dto/revenue-summary-response.dto';
import { ReviewWithdrawalDto } from '../dto/review-with-drawal.dto';

import { TransactionFlowSummaryQueryDto } from '../dto/transaction-flow-summary-query.dto';
import { WithdrawalListQueryDto } from '../dto/with-drawal-list-query.dto';
import { WithdrawalRequestEntity } from '../entity/withdrawal-request.entity';
import {
  WalletRepository,
  WalletTransactionRepository,
  WithdrawalRequestRepository,
} from '../finance.repository';

export interface CustomerSpendingItem {
  customerId: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  walletId: string | null;
  totalSpent: number;
  completedBookings: number;
}

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    private readonly walletRepo: WalletRepository,
    private readonly transactionRepo: WalletTransactionRepository,
    private readonly withdrawalRepo: WithdrawalRequestRepository,
    private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
    private readonly payoutService: PayoutService,
  ) {}

  async findAllWithdrawals(
    query: WithdrawalListQueryDto,
  ): Promise<PaginatedData<WithdrawalRequestEntity>> {
    return this.withdrawalRepo.findWithPagination(query);
  }

  async findOneWithdrawal(id: string): Promise<WithdrawalRequestEntity> {
    const wr = await this.withdrawalRepo.findOne({
      where: { id },
      relations: ['wallet', 'tasker', 'tasker.user'],
    });
    if (!wr) throw new NotFoundException('WITHDRAWAL_NOT_FOUND');
    return wr;
  }

  /**
   * Admin duyệt yêu cầu rút tiền của Tasker.
   *
   * Flow 3 pha khi APPROVED:
   *   1. DB transaction: khóa row (FOR UPDATE), trừ ví, đánh status APPROVED.
   *   2. Gọi PayOS Payout API ngoài transaction (tránh giữ lock trong khi chờ network).
   *   3. Nếu thành công → PROCESSED. Nếu thất bại → hoàn ví, reset PENDING, ném lỗi 502.
   *
   * Tách bước 2 ra ngoài DB transaction vì giữ pessimistic_write trong khi gọi HTTP
   * ngoài mạng (vài giây) sẽ block các transaction khác trên cùng ví.
   */
  async reviewWithdrawal(
    id: string,
    dto: ReviewWithdrawalDto,
  ): Promise<WithdrawalRequestEntity> {
    let withdrawalSnapshot: WithdrawalRequestEntity | null = null;

    this.logger.log(
      `reviewWithdrawal bắt đầu: withdrawalId=${id}, status=${dto.status}`,
    );

    // Phase 1: DB transaction — lock, debit wallet, mark APPROVED
    await this.dataSource.transaction(async (manager) => {
      const withdrawalRepository = manager.getRepository(
        WithdrawalRequestEntity,
      );

      const withdrawal = await withdrawalRepository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!withdrawal) {
        throw new NotFoundException('WITHDRAWAL_NOT_FOUND');
      }

      if (withdrawal.status !== WithdrawalStatus.PENDING) {
        throw new ConflictException(
          `WITHDRAWAL_NOT_PENDING: Cannot review a request with status "${withdrawal.status}"`,
        );
      }

      if (!withdrawal.taskerId) {
        throw new BadRequestException('WITHDRAWAL_TASKER_NOT_FOUND');
      }

      if (dto.status === WithdrawalStatus.APPROVED) {
        const wallet = await manager.getRepository(WalletEntity).findOne({
          where: { id: withdrawal.walletId },
        });

        if (!wallet) {
          throw new NotFoundException('WALLET_NOT_FOUND');
        }

        this.logger.log(
          `Phase 1 - debitWallet: withdrawalId=${id}, walletId=${wallet.id}, amount=${withdrawal.amount}`,
        );

        await this.walletService.debitWallet(manager, {
          wallet,
          amount: Number(withdrawal.amount),
          type: WalletTransactionType.WITHDRAW,
          referenceId: withdrawal.id,
          referenceType: 'WITHDRAWAL_REQUEST',
          description: `Rút tiền về ${withdrawal.bankName ?? 'tài khoản'} - ${withdrawal.bankAccount ?? ''}`,
        });

        this.logger.log(
          `Phase 1 - debitWallet thành công: withdrawalId=${id}, WalletTransaction WITHDRAW đã tạo`,
        );

        withdrawalSnapshot = withdrawal;
      }

      await withdrawalRepository.update(id, {
        status: dto.status,
        ...(dto.note !== undefined ? { note: dto.note } : {}),
        ...(dto.adminNote !== undefined ? { adminNote: dto.adminNote } : {}),
        ...(dto.proofImageUrl !== undefined
          ? { proofImageUrl: dto.proofImageUrl }
          : {}),
        reviewedAt: new Date(),
      });

      this.logger.log(
        `Phase 1 hoàn tất: withdrawalId=${id}, status → ${dto.status}`,
      );
    });

    // Phase 2 & 3: PayOS payout + finalize status (only for APPROVED)
    if (dto.status === WithdrawalStatus.APPROVED && withdrawalSnapshot) {
      const snap = withdrawalSnapshot as WithdrawalRequestEntity;

      if (!snap.bankBin || !snap.bankAccount) {
        this.logger.warn(
          `Thiếu bankBin/bankAccount: withdrawalId=${id}, taskerId=${snap.taskerId} — hoàn tiền và reset PENDING`,
        );
        await this.reverseWithdrawalDebit(snap);
        await this.withdrawalRepo.update(id, {
          status: WithdrawalStatus.PENDING,
        });
        throw new BadRequestException(
          'WITHDRAWAL_MISSING_BANK_BIN: Tasker chưa cập nhật mã BIN ngân hàng',
        );
      }

      try {
        this.logger.log(
          `Phase 2 - gọi PayOS payout: withdrawalId=${id}, amount=${snap.amount}, toAccount=${snap.bankAccount}, bankBin=${snap.bankBin}`,
        );

        const payosReferenceId = await this.payoutService.createSinglePayout({
          amount: Number(snap.amount),
          description: `Rut tien - ${snap.bankAccount}`.slice(0, 25),
          toBin: snap.bankBin,
          toAccountNumber: snap.bankAccount,
          category: ['salary'],
        });

        this.logger.log(
          `Phase 3 - lưu PROCESSED: withdrawalId=${id}, payosReferenceId=${payosReferenceId}`,
        );

        await this.withdrawalRepo.update(id, {
          status: WithdrawalStatus.PROCESSED,
          processedAt: new Date(),
          payosReferenceId,
        });

        this.logger.log(
          `reviewWithdrawal hoàn tất: withdrawalId=${id}, payosReferenceId=${payosReferenceId}`,
        );
      } catch (err) {
        this.logger.error(
          `Phase 2 thất bại: withdrawalId=${id}, error=${(err as Error).message} — hoàn tiền, reset PENDING`,
        );
        // Payout thất bại → hoàn tiền về ví, reset về PENDING để admin retry
        await this.reverseWithdrawalDebit(snap);
        await this.withdrawalRepo.update(id, {
          status: WithdrawalStatus.PENDING,
        });
        throw err;
      }
    }

    return this.findOneWithdrawal(id);
  }

  private async reverseWithdrawalDebit(
    withdrawal: WithdrawalRequestEntity,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const wallet = await manager.getRepository(WalletEntity).findOne({
        where: { id: withdrawal.walletId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) return;
      await this.walletService.creditWallet(manager, {
        wallet,
        amount: Number(withdrawal.amount),
        type: WalletTransactionType.ADJUSTMENT,
        referenceId: withdrawal.id,
        referenceType: 'WITHDRAWAL_REVERSAL',
        description: `Hoàn tiền do payout PayOS thất bại - yêu cầu ${withdrawal.id}`,
      });
    });
  }

  async getRevenueSummary(
    query: RevenueQueryDto,
  ): Promise<RevenueSummaryResponseDto[]> {
    return this.transactionRepo.getRevenueSummary(query);
  }

  async getFinancialOverview(): Promise<{
    totalWalletBalance: number;
    totalHoldBalance: number;
    pendingWithdrawals: number;
    pendingWithdrawalAmount: number;
  }> {
    const [balanceResult] = await this.dataSource.query<
      [{ totalBalance: string; totalHold: string }]
    >(
      `SELECT
         COALESCE(SUM(balance), 0)::numeric AS "totalBalance",
         COALESCE(SUM(hold_balance), 0)::numeric AS "totalHold"
       FROM wallets`,
    );

    const [withdrawResult] = await this.dataSource.query<
      [{ count: string; totalAmount: string }]
    >(
      `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS "totalAmount"
       FROM tasker_withdrawal_requests
       WHERE status = 'PENDING'`,
    );

    return {
      totalWalletBalance: parseFloat(balanceResult.totalBalance),
      totalHoldBalance: parseFloat(balanceResult.totalHold),
      pendingWithdrawals: parseInt(withdrawResult.count, 10),
      pendingWithdrawalAmount: parseFloat(withdrawResult.totalAmount),
    };
  }

  async findAllTransactions(
    query: WalletTransactionListQueryDto,
  ): Promise<PaginatedData<WalletTransactionEntity>> {
    return this.transactionRepo.findWithPagination(query);
  }

  async getTransactionFlowSummary(query: TransactionFlowSummaryQueryDto) {
    return this.transactionRepo.getFlowSummary(query.fromDate, query.toDate);
  }

  /**
   * Danh sách customer kèm tổng chi tiêu (tổng totalPrice các đơn COMPLETED,
   * mọi phương thức thanh toán), sắp theo chi tiêu giảm dần. `walletId` trả kèm
   * để FE lọc bảng giao dịch theo ví của customer được chọn.
   */
  async getCustomerSpending(
    query: CustomerSpendingQueryDto,
  ): Promise<PaginatedData<CustomerSpendingItem>> {
    const { page = 1, limit = 10 } = query;
    const search = query.search?.trim() ?? '';
    const offset = (page - 1) * limit;

    const searchWhere = search
      ? `WHERE u.full_name ILIKE $3 OR u.email ILIKE $3 OR u.phone ILIKE $3`
      : '';
    const params: (string | number)[] = [limit, offset];
    if (search) params.push(`%${search}%`);

    const rows = await this.dataSource.query<
      Array<{
        customerId: string;
        fullName: string;
        email: string;
        phone: string | null;
        avatarUrl: string | null;
        walletId: string | null;
        totalSpent: string;
        completedBookings: number;
      }>
    >(
      `SELECT
         c.id AS "customerId",
         u.full_name AS "fullName",
         u.email AS "email",
         u.phone AS "phone",
         u.avatar_url AS "avatarUrl",
         w.id AS "walletId",
         COALESCE(SUM(b.total_price) FILTER (WHERE b.status = 'COMPLETED'), 0)::numeric AS "totalSpent",
         COUNT(b.id) FILTER (WHERE b.status = 'COMPLETED')::int AS "completedBookings"
       FROM customers c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN wallets w ON w.customer_id = c.id
       LEFT JOIN bookings b ON b.customer_id = c.id
       ${searchWhere}
       GROUP BY c.id, u.full_name, u.email, u.phone, u.avatar_url, w.id
       ORDER BY "totalSpent" DESC, u.full_name ASC
       LIMIT $1 OFFSET $2`,
      params,
    );

    const countWhere = search
      ? `WHERE u.full_name ILIKE $1 OR u.email ILIKE $1 OR u.phone ILIKE $1`
      : '';
    const [countRow] = await this.dataSource.query<[{ count: string }]>(
      `SELECT COUNT(*) AS count
       FROM customers c
       JOIN users u ON u.id = c.user_id
       ${countWhere}`,
      search ? [`%${search}%`] : [],
    );

    const items: CustomerSpendingItem[] = rows.map((row) => ({
      ...row,
      totalSpent: parseFloat(row.totalSpent),
    }));
    const total = parseInt(countRow.count, 10);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createManualAdjustment(
    dto: ManualAdjustmentDto,
    adminUserId: string,
  ): Promise<WalletTransactionEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const [wallet, admin] = await Promise.all([
        queryRunner.manager.findOne(WalletEntity, {
          where: { id: dto.walletId },
          lock: { mode: 'pessimistic_write' },
        }),
        queryRunner.manager.findOne(User, {
          where: { id: adminUserId },
        }),
      ]);

      if (!wallet) throw new NotFoundException('WALLET_NOT_FOUND');
      if (!admin) throw new NotFoundException('ADMIN_USER_NOT_FOUND');

      const balanceBefore = Number(wallet.balance);
      const newBalance = balanceBefore + Number(dto.amount);

      if (newBalance < 0) {
        throw new BadRequestException(
          'INSUFFICIENT_BALANCE: Adjustment would result in negative balance',
        );
      }

      wallet.balance = newBalance;
      await queryRunner.manager.save(WalletEntity, wallet);

      const actorLabel = `${admin.fullName} (${admin.email})`;
      const description = `${dto.description} | Điều chỉnh bởi Admin: ${actorLabel}`;

      const tx = queryRunner.manager.create(WalletTransactionEntity, {
        wallet,
        type: dto.type,
        amount: dto.amount,
        balanceBefore,
        balanceAfter: newBalance,
        referenceId: admin.id,
        referenceType: 'ADMIN_ADJUSTMENT',
        description,
      });

      const saved = await queryRunner.manager.save(WalletTransactionEntity, tx);
      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getWalletById(id: string): Promise<WalletEntity> {
    const wallet = await this.walletRepo.findOne({
      where: { id },
      relations: ['tasker', 'tasker.user', 'customer', 'customer.user'],
    });
    if (!wallet) throw new NotFoundException('WALLET_NOT_FOUND');
    return wallet;
  }
}
