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
import { CustomerEntity } from '../../customer/entity/customer.entity';
import { WalletTopupOrderEntity } from '../../wallet/entity/wallet-topup-order.entity';
import { CustomerWithdrawalRequestEntity } from '../../wallet/entity/customer-withdrawal-request.entity';

import { WalletTransactionEntity } from '../../wallet/entity/wallet-transaction.entity';
import { WalletEntity } from '../../wallet/entity/wallet.entity';
import { CustomerSpendingQueryDto } from '../dto/customer-spending-query.dto';
import { ManualAdjustmentDto } from '../dto/manual-adjustment.dto';

import { RevenueQueryDto } from '../dto/revenue-query.dto';
import { RevenuePayrollQueryDto } from '../dto/revenue-payroll-query.dto';
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
    if (!wr) throw new NotFoundException('Không tìm thấy yêu cầu rút tiền');
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

    // Phase 0: quỹ chi hộ có đủ không? Kiểm tra TRƯỚC khi trừ ví để không rơi
    // vào vòng trừ-rồi-hoàn và để admin thấy đúng nguyên nhân "hết quỹ".
    if (dto.status === WithdrawalStatus.APPROVED) {
      const pending = await this.withdrawalRepo.findOne({ where: { id } });
      if (!pending) {
        throw new NotFoundException('Không tìm thấy yêu cầu rút tiền');
      }
      await this.payoutService.assertSufficientBalance(Number(pending.amount));
    }

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
        throw new NotFoundException('Không tìm thấy yêu cầu rút tiền');
      }

      if (withdrawal.status !== WithdrawalStatus.PENDING) {
        throw new ConflictException(
          `WITHDRAWAL_NOT_PENDING: Cannot review a request with status "${withdrawal.status}"`,
        );
      }

      if (!withdrawal.taskerId) {
        throw new BadRequestException(
          'Không tìm thấy Tasker của yêu cầu rút tiền này',
        );
      }

      if (dto.status === WithdrawalStatus.APPROVED) {
        const wallet = await manager.getRepository(WalletEntity).findOne({
          where: { id: withdrawal.walletId },
        });

        if (!wallet) {
          throw new NotFoundException('Không tìm thấy ví');
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

  async getRevenuePayroll(query: RevenuePayrollQueryDto) {
    return this.transactionRepo.getRevenuePayroll(query);
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

      if (!wallet) throw new NotFoundException('Không tìm thấy ví');
      if (!admin)
        throw new NotFoundException('Không tìm thấy tài khoản quản trị viên');

      const balanceBefore = Number(wallet.balance);
      const newBalance = balanceBefore + Number(dto.amount);

      if (newBalance < 0) {
        throw new BadRequestException(
          'Số dư không đủ — điều chỉnh này sẽ làm số dư ví bị âm',
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
    if (!wallet) throw new NotFoundException('Không tìm thấy ví');
    return wallet;
  }

  async getCustomerWalletOverview(customerId: string) {
    const customer = await this.dataSource
      .getRepository(CustomerEntity)
      .findOne({
        where: { id: customerId },
        relations: ['user'],
      });

    if (!customer) {
      throw new NotFoundException('Không tìm thấy khách hàng');
    }

    let wallet = await this.dataSource.getRepository(WalletEntity).findOne({
      where: { customer: { id: customerId } },
    });

    if (!wallet) {
      wallet = await this.walletService.getOrCreateCustomerWallet(
        this.dataSource.manager,
        customer,
      );
    }

    const [stats] = await this.dataSource.query<
      Array<{
        totalSpent: string;
        totalTopup: string;
        totalRefunded: string;
        topupCount: string;
        withdrawalCount: string;
        lastTransactionAt: Date | null;
      }>
    >(
      `SELECT
         COALESCE(SUM(b.total_price) FILTER (WHERE b.status = 'COMPLETED'), 0)::numeric AS "totalSpent",
         COALESCE(SUM(wto.amount_vnd) FILTER (WHERE wto.status = 'COMPLETED'), 0)::numeric AS "totalTopup",
         COALESCE(SUM(cwr.amount) FILTER (WHERE cwr.status = 'APPROVED'), 0)::numeric AS "totalRefunded",
         COUNT(DISTINCT wto.id) FILTER (WHERE wto.status = 'COMPLETED')::int AS "topupCount",
         COUNT(DISTINCT cwr.id)::int AS "withdrawalCount",
         MAX(wt.created_at) AS "lastTransactionAt"
       FROM customers c
       LEFT JOIN bookings b ON b.customer_id = c.id
       LEFT JOIN wallet_topup_orders wto ON wto.customer_id = c.id
       LEFT JOIN customer_withdrawal_requests cwr ON cwr.customer_id = c.id
       LEFT JOIN wallets w ON w.customer_id = c.id
       LEFT JOIN wallet_transactions wt ON wt.wallet_id = w.id
       WHERE c.id = $1
       GROUP BY c.id`,
      [customerId],
    );

    return {
      customerId: customer.id,
      customerName: customer.user?.fullName ?? 'N/A',
      customerEmail: customer.user?.email ?? 'N/A',
      customerPhone: customer.user?.phone ?? null,
      avatarUrl: customer.user?.avatarUrl ?? null,
      walletId: wallet.id,
      balance: parseFloat(String(wallet.balance)),
      holdBalance: parseFloat(String(wallet.holdBalance)),
      totalSpent: stats ? parseFloat(stats.totalSpent) : 0,
      totalTopupVnd: stats ? parseFloat(stats.totalTopup) : 0,
      totalRefunded: stats ? parseFloat(stats.totalRefunded) : 0,
      topupCount: stats ? parseInt(String(stats.topupCount), 10) : 0,
      withdrawalCount: stats ? parseInt(String(stats.withdrawalCount), 10) : 0,
      lastTransactionAt: stats?.lastTransactionAt ?? null,
    };
  }

  async getCustomerWalletTransactions(
    customerId: string,
    query: WalletTransactionListQueryDto,
  ) {
    const wallet = await this.dataSource.getRepository(WalletEntity).findOne({
      where: { customer: { id: customerId } },
    });

    if (!wallet) {
      return {
        items: [],
        total: 0,
        page: query.page ?? 1,
        limit: query.limit ?? 10,
        totalPages: 0,
      };
    }

    return this.transactionRepo.findWithPagination({
      ...query,
      walletId: wallet.id,
    });
  }

  async getCustomerTopups(
    customerId: string,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
    },
  ) {
    const page = params?.page ? Number(params.page) : 1;
    const limit = params?.limit ? Number(params.limit) : 10;
    const take = Math.min(100, Math.max(1, limit));
    const skip = (Math.max(1, page) - 1) * take;

    const qb = this.dataSource
      .getRepository(WalletTopupOrderEntity)
      .createQueryBuilder('t')
      .where('t.customerId = :customerId', { customerId });

    if (params?.status && params.status !== 'ALL') {
      qb.andWhere('t.status = :status', { status: params.status });
    }

    if (params?.search && params.search.trim()) {
      qb.andWhere(
        '(t.paypalOrderId ILIKE :search OR t.captureId ILIKE :search)',
        { search: `%${params.search.trim()}%` },
      );
    }

    if (params?.fromDate) {
      qb.andWhere('t.createdAt >= :fromDate', {
        fromDate: new Date(params.fromDate),
      });
    }

    if (params?.toDate) {
      qb.andWhere('t.createdAt <= :toDate', {
        toDate: new Date(params.toDate + 'T23:59:59'),
      });
    }

    qb.orderBy('t.createdAt', 'DESC').skip(skip).take(take);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page: Math.max(1, page),
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async getCustomerWithdrawals(customerId: string, page = 1, limit = 10) {
    const take = Math.min(100, Math.max(1, limit));
    const skip = (Math.max(1, page) - 1) * take;

    const [items, total] = await this.dataSource
      .getRepository(CustomerWithdrawalRequestEntity)
      .findAndCount({
        where: { customerId },
        order: { createdAt: 'DESC' },
        take,
        skip,
      });

    return {
      items,
      total,
      page: Math.max(1, page),
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async getCustomerServiceBreakdown(
    customerId: string,
    from?: string,
    to?: string,
  ): Promise<
    Array<{
      serviceId: string;
      serviceName: string;
      iconUrl: string | null;
      totalBookings: number;
      completedBookings: number;
      cancelledBookings: number;
      totalSpent: number;
      spendingPercent: number;
      lastBookedAt: string | null;
    }>
  > {
    const params: (string | null)[] = [customerId, from ?? null, to ?? null];

    const rows = await this.dataSource.query<
      Array<{
        serviceId: string;
        serviceName: string;
        iconUrl: string | null;
        totalBookings: string;
        completedBookings: string;
        cancelledBookings: string;
        totalSpent: string | null;
        lastBookedAt: Date | null;
      }>
    >(
      `SELECT
         sp.id                                                             AS "serviceId",
         sp.name                                                           AS "serviceName",
         sp.icon_url                                                       AS "iconUrl",
         COUNT(b.id)::int                                                  AS "totalBookings",
         COUNT(b.id) FILTER (WHERE b.status = 'COMPLETED')::int           AS "completedBookings",
         COUNT(b.id) FILTER (WHERE b.status = 'CANCELLED')::int           AS "cancelledBookings",
         COALESCE(SUM(b.total_price) FILTER (WHERE b.status = 'COMPLETED'), 0)::numeric AS "totalSpent",
         MAX(b.created_at)                                                 AS "lastBookedAt"
       FROM bookings b
       JOIN service_packages sp ON b.package_id = sp.id
       JOIN customers c ON b.customer_id = c.id
       WHERE c.id = $1
         AND ($2::date IS NULL OR b.created_at >= $2::date)
         AND ($3::date IS NULL OR b.created_at < ($3::date::date + INTERVAL '1 day'))
       GROUP BY sp.id, sp.name, sp.icon_url
       ORDER BY "totalSpent" DESC NULLS LAST`,
      params,
    );

    const grandTotal = rows.reduce(
      (sum, r) => sum + parseFloat(r.totalSpent ?? '0'),
      0,
    );

    return rows.map((r) => {
      const spent = parseFloat(r.totalSpent ?? '0');
      return {
        serviceId: r.serviceId,
        serviceName: r.serviceName,
        iconUrl: r.iconUrl ?? null,
        totalBookings: parseInt(String(r.totalBookings), 10),
        completedBookings: parseInt(String(r.completedBookings), 10),
        cancelledBookings: parseInt(String(r.cancelledBookings), 10),
        totalSpent: spent,
        spendingPercent:
          grandTotal > 0 ? Math.round((spent / grandTotal) * 100 * 10) / 10 : 0,
        lastBookedAt: r.lastBookedAt ? r.lastBookedAt.toISOString() : null,
      };
    });
  }

  /**
   * Truy xuất chi tiết 1 giao dịch ví kèm tất cả dữ liệu liên quan từ các bảng
   * (wallet_transactions, wallets, bookings, service_packages, taskers, customers, wallet_topup_orders).
   */
  async getTransactionDetail(transactionId: string) {
    const rows = await this.dataSource.query<
      Array<{
        id: string;
        walletId: string;
        bookingId: string | null;
        referenceId: string | null;
        referenceType: string | null;
        type: string;
        amount: string;
        balanceBefore: string;
        balanceAfter: string;
        description: string | null;
        createdAt: Date | string;
        customerId: string | null;
        customerFullName: string | null;
        customerEmail: string | null;
        customerPhone: string | null;
        bookingCode: string | null;
        bookingStatus: string | null;
        serviceAddress: string | null;
        bookingDistrict: string | null;
        bookingBasePrice: string | null;
        bookingAddonPrice: string | null;
        bookingPeakFee: string | null;
        bookingPetFee: string | null;
        bookingDiscountAmount: string | null;
        bookingTotalAmount: string | null;
        paymentMethod: string | null;
        bookingDurationHours: string | null;
        bookingNote: string | null;
        bookingSource: string | null;
        bookingScheduledStart: Date | string | null;
        bookingScheduledEnd: Date | string | null;
        bookingCreatedAt: Date | string | null;
        packageName: string | null;
        packageIconUrl: string | null;
        taskerId: string | null;
        taskerFullName: string | null;
        taskerPhone: string | null;
        paypalOrderId: string | null;
        paypalCaptureId: string | null;
        paypalAmountUsd: string | null;
        paypalFxRate: string | null;
        topupProvider: string | null;
        topupStatus: string | null;
      }>
    >(
      `SELECT
         wt.id                      AS "id",
         wt.wallet_id               AS "walletId",
         wt.booking_id              AS "bookingId",
         wt.reference_id            AS "referenceId",
         wt.reference_type          AS "referenceType",
         wt.type                    AS "type",
         wt.amount                  AS "amount",
         wt.balance_before          AS "balanceBefore",
         wt.balance_after           AS "balanceAfter",
         wt.description             AS "description",
         wt.created_at              AS "createdAt",
         c.id                       AS "customerId",
         cu.full_name               AS "customerFullName",
         cu.email                   AS "customerEmail",
         cu.phone                   AS "customerPhone",
         b.booking_code             AS "bookingCode",
         b.status                   AS "bookingStatus",
         b.address                  AS "serviceAddress",
         b.district                 AS "bookingDistrict",
         b.base_price               AS "bookingBasePrice",
         b.addon_price              AS "bookingAddonPrice",
         b.peak_fee                 AS "bookingPeakFee",
         b.pet_fee                  AS "bookingPetFee",
         b.discount_amount          AS "bookingDiscountAmount",
         b.total_price              AS "bookingTotalAmount",
         b.payment_method           AS "paymentMethod",
         b.duration_hours           AS "bookingDurationHours",
         b.note                     AS "bookingNote",
         b.source                   AS "bookingSource",
         b.scheduled_start          AS "bookingScheduledStart",
         b.scheduled_end            AS "bookingScheduledEnd",
         b.created_at               AS "bookingCreatedAt",
         sp.name                    AS "packageName",
         sp.icon_url                AS "packageIconUrl",
         b.tasker_id                AS "taskerId",
         tu.full_name               AS "taskerFullName",
         tu.phone                   AS "taskerPhone",
         wto.paypal_order_id        AS "paypalOrderId",
         wto.capture_id             AS "paypalCaptureId",
         wto.amount_usd             AS "paypalAmountUsd",
         wto.fx_rate                AS "paypalFxRate",
         wto.provider               AS "topupProvider",
         wto.status                 AS "topupStatus"
       FROM wallet_transactions wt
       LEFT JOIN wallets w ON wt.wallet_id = w.id
       LEFT JOIN customers c ON w.customer_id = c.id
       LEFT JOIN users cu ON c.user_id = cu.id
       LEFT JOIN bookings b ON wt.booking_id = b.id
       LEFT JOIN service_packages sp ON b.package_id = sp.id
       LEFT JOIN taskers t ON b.tasker_id = t.id
       LEFT JOIN users tu ON t.user_id = tu.id
       LEFT JOIN wallet_topup_orders wto ON (wto.wallet_tx_id = wt.id OR wto.id = wt.reference_id)
       WHERE wt.id = $1`,
      [transactionId],
    );

    if (!rows || rows.length === 0) {
      throw new NotFoundException('Giao dịch ví không tồn tại');
    }

    const r = rows[0];
    return {
      id: r.id,
      walletId: r.walletId,
      bookingId: r.bookingId,
      referenceId: r.referenceId,
      referenceType: r.referenceType,
      type: r.type,
      amount: parseFloat(r.amount),
      balanceBefore: parseFloat(r.balanceBefore),
      balanceAfter: parseFloat(r.balanceAfter),
      description: r.description,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
      customer: {
        id: r.customerId,
        fullName: r.customerFullName,
        email: r.customerEmail,
        phone: r.customerPhone,
      },
      paypalTopup:
        r.paypalOrderId || r.paypalCaptureId || r.topupProvider
          ? {
              provider: r.topupProvider || 'PAYPAL',
              paypalOrderId: r.paypalOrderId,
              captureId: r.paypalCaptureId,
              amountUsd: r.paypalAmountUsd
                ? parseFloat(r.paypalAmountUsd)
                : null,
              fxRate: r.paypalFxRate ? parseFloat(r.paypalFxRate) : null,
              status: r.topupStatus,
            }
          : null,
      booking: r.bookingId
        ? {
            id: r.bookingId,
            bookingCode: r.bookingCode,
            status: r.bookingStatus,
            serviceAddress: r.serviceAddress,
            district: r.bookingDistrict,
            basePrice: r.bookingBasePrice ? parseFloat(r.bookingBasePrice) : 0,
            addonPrice: r.bookingAddonPrice
              ? parseFloat(r.bookingAddonPrice)
              : 0,
            peakFee: r.bookingPeakFee ? parseFloat(r.bookingPeakFee) : 0,
            petFee: r.bookingPetFee ? parseFloat(r.bookingPetFee) : 0,
            discountAmount: r.bookingDiscountAmount
              ? parseFloat(r.bookingDiscountAmount)
              : 0,
            totalAmount: r.bookingTotalAmount
              ? parseFloat(r.bookingTotalAmount)
              : 0,
            paymentMethod: r.paymentMethod,
            durationHours: r.bookingDurationHours
              ? parseFloat(r.bookingDurationHours)
              : null,
            note: r.bookingNote,
            source: r.bookingSource,
            scheduledStart: r.bookingScheduledStart
              ? new Date(r.bookingScheduledStart).toISOString()
              : null,
            scheduledEnd: r.bookingScheduledEnd
              ? new Date(r.bookingScheduledEnd).toISOString()
              : null,
            createdAt: r.bookingCreatedAt
              ? new Date(r.bookingCreatedAt).toISOString()
              : null,
            package: {
              name: r.packageName,
              iconUrl: r.packageIconUrl,
            },
            tasker: r.taskerFullName
              ? {
                  id: r.taskerId,
                  fullName: r.taskerFullName,
                  phone: r.taskerPhone,
                }
              : null,
          }
        : null,
    };
  }
}
