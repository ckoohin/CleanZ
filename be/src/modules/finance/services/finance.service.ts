import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  WalletRepository,
  WalletTransactionRepository,
  WithdrawalRequestRepository,
} from '../finance.repository';
import { WithdrawalRequestEntity } from '../entity/withdrawal-request.entity';
import { WalletTransactionEntity } from '../../wallet/entity/wallet-transaction.entity';
import { WalletEntity } from '../../wallet/entity/wallet.entity';
import { PaginatedData } from '../../../common/helpers/response.interface';
import { WalletTransactionType } from '../../../common/enums/wallet-transaction-type.enum';
import { WithdrawalListQueryDto } from '../dto/with-drawal-list-query.dto';
import { ReviewWithdrawalDto } from '../dto/review-with-drawal.dto';
import { WithdrawalStatus } from 'src/common/enums/with-drawal-status.enum';
import { RevenueQueryDto } from '../dto/revenue-query.dto';
import { RevenueSummaryResponseDto } from '../dto/revenue-summary-response.dto';
import { WalletTransactionListQueryDto } from 'src/modules/wallet/dto/wallet-transaction-list-query.dto';
import { WalletService } from 'src/modules/wallet/wallet.service';
import { ManualAdjustmentDto } from '../dto/manual-adjustment.dto';
import { User } from '../../users/entities/user.entity';
import { TransactionFlowSummaryQueryDto } from '../dto/transaction-flow-summary-query.dto';
import { CustomerSpendingQueryDto } from '../dto/customer-spending-query.dto';

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
  constructor(
    private readonly walletRepo: WalletRepository,
    private readonly transactionRepo: WalletTransactionRepository,
    private readonly withdrawalRepo: WithdrawalRequestRepository,
    private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
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
   * Khóa row yêu cầu (FOR UPDATE) rồi mới kiểm tra trạng thái — trước đây đọc ngoài
   * transaction nên hai admin bấm duyệt cùng lúc đều thấy PENDING và ví bị trừ HAI lần.
   * Việc trừ ví giao cho `walletService.debitWallet` (khóa ví + tính lại số dư) thay vì
   * ghi đè `balance` bằng giá trị đọc từ trước — cách cũ có thể xóa trắng khoản thu nhập
   * vừa được cộng vào ví ở một transaction khác (lost update).
   */
  async reviewWithdrawal(
    id: string,
    dto: ReviewWithdrawalDto,
  ): Promise<WithdrawalRequestEntity> {
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

        await this.walletService.debitWallet(manager, {
          wallet,
          amount: Number(withdrawal.amount),
          type: WalletTransactionType.WITHDRAW,
          referenceId: withdrawal.id,
          referenceType: 'WITHDRAWAL_REQUEST',
          description: `Rút tiền về ${withdrawal.bankName ?? 'tài khoản'} - ${withdrawal.bankAccount ?? ''}`,
        });
      }

      await withdrawalRepository.update(id, {
        status: dto.status,
        // note gốc của tasker giữ nguyên, chỉ lưu adminNote và proof riêng
        ...(dto.note !== undefined ? { note: dto.note } : {}),
        ...(dto.adminNote !== undefined ? { adminNote: dto.adminNote } : {}),
        ...(dto.proofImageUrl !== undefined
          ? { proofImageUrl: dto.proofImageUrl }
          : {}),
        reviewedAt: new Date(),
        ...(dto.status === WithdrawalStatus.APPROVED
          ? { processedAt: new Date() }
          : {}),
      });
    });

    return this.findOneWithdrawal(id);
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
