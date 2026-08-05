import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { WalletEntity } from '../wallet/entity/wallet.entity';
import { WalletTransactionEntity } from '../wallet/entity/wallet-transaction.entity';
import { WithdrawalRequestEntity } from './entity/withdrawal-request.entity';
import { PaginatedData } from '../../common/helpers/response.interface';
import { WalletTransactionListQueryDto } from '../wallet/dto/wallet-transaction-list-query.dto';
import { RevenueSummaryResponseDto } from './dto/revenue-summary-response.dto';
import { WithdrawalListQueryDto } from './dto/with-drawal-list-query.dto';
import { RevenueQueryDto } from './dto/revenue-query.dto';
import { VN_NOW_SQL } from '../../common/helpers/vietnam-time.helper';

@Injectable()
export class WalletRepository extends Repository<WalletEntity> {
  constructor(private readonly dataSource: DataSource) {
    super(WalletEntity, dataSource.createEntityManager());
  }

  async findByTaskerId(tasker: string): Promise<WalletEntity | null> {
    return this.findOne({
      where: {
        tasker: {
          id: tasker,
        },
      },
    });
  }

  async findByCustomerId(customer: string): Promise<WalletEntity | null> {
    return this.findOne({
      where: {
        customer: {
          id: customer,
        },
      },
    });
  }
}

@Injectable()
export class WalletTransactionRepository extends Repository<WalletTransactionEntity> {
  constructor(private readonly dataSource: DataSource) {
    super(WalletTransactionEntity, dataSource.createEntityManager());
  }

  async findWithPagination(
    query: WalletTransactionListQueryDto,
  ): Promise<PaginatedData<WalletTransactionEntity>> {
    const {
      page = 1,
      limit = 20,
      walletId,
      ownerType,
      type,
      fromDate,
      toDate,
      search,
      direction,
    } = query;
    const skip = (page - 1) * limit;

    const qb = this.createQueryBuilder('wt')
      .leftJoinAndSelect('wt.wallet', 'w')
      .leftJoinAndSelect('wt.booking', 'booking')
      .leftJoinAndSelect('booking.customer', 'bookingCustomer')
      .leftJoinAndSelect('bookingCustomer.user', 'bookingCustomerUser')
      .leftJoinAndSelect('booking.tasker', 'bookingTasker')
      .leftJoinAndSelect('bookingTasker.user', 'bookingTaskerUser')
      .leftJoinAndSelect('booking.package', 'bookingPackage')
      .leftJoinAndSelect('w.tasker', 'tasker')
      .leftJoinAndSelect('tasker.user', 'taskerUser')
      .leftJoinAndSelect('w.customer', 'customer')
      .leftJoinAndSelect('customer.user', 'customerUser')
      .orderBy('wt.createdAt', 'DESC');

    if (walletId) qb.andWhere('w.id = :walletId', { walletId });
    if (ownerType) qb.andWhere('w.ownerType = :ownerType', { ownerType });
    if (type) qb.andWhere('wt.type = :type', { type });
    if (fromDate)
      qb.andWhere('wt.createdAt >= :fromDate', {
        fromDate: new Date(fromDate),
      });
    if (toDate)
      qb.andWhere('wt.createdAt <= :toDate', {
        toDate: new Date(toDate + 'T23:59:59'),
      });
    if (search && search.trim()) {
      qb.andWhere(
        '(wt.description ILIKE :search OR booking.code ILIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }
    if (direction === 'IN') {
      qb.andWhere(
        "(wt.type IN ('DEPOSIT', 'REFUND', 'DEPOSIT_RELEASE') OR (wt.type = 'ADJUSTMENT' AND wt.balanceAfter > wt.balanceBefore))",
      );
    } else if (direction === 'OUT') {
      qb.andWhere(
        "(wt.type IN ('PAYMENT', 'WITHDRAW', 'DEPOSIT_HOLD', 'DEPOSIT_DEDUCT', 'CANCELLATION_FEE', 'PLATFORM_FEE') OR (wt.type = 'ADJUSTMENT' AND wt.balanceAfter < wt.balanceBefore))",
      );
    }

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Tổng dòng tiền theo khoảng ngày cho khối "tổng quan giao dịch" trang admin.
   *
   * Mỗi lần chuyển tiền ghi 2 bút toán CÙNG loại (một bên trừ, một bên cộng) nên
   * từng chỉ số chỉ đếm ở một vế để không nhân đôi: thanh toán/hoàn tiền lấy vế
   * ví khách, nạp/rút lấy vế ví cá nhân (nạp PayOS và rút tiền chỉ ghi 1 bút toán).
   */
  async getFlowSummary(
    fromDate?: string,
    toDate?: string,
  ): Promise<{
    totalDeposit: number;
    totalPayment: number;
    totalRefund: number;
    totalWithdraw: number;
    totalTransactions: number;
  }> {
    const conditions: string[] = [];
    const params: string[] = [];
    if (fromDate) {
      params.push(fromDate);
      conditions.push(`wt.created_at >= $${params.length}`);
    }
    if (toDate) {
      params.push(`${toDate} 23:59:59`);
      conditions.push(`wt.created_at <= $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [row] = await this.dataSource.query<
      [
        {
          totalDeposit: string;
          totalPayment: string;
          totalRefund: string;
          totalWithdraw: string;
          totalTransactions: string;
        },
      ]
    >(
      `SELECT
         COALESCE(SUM(wt.amount) FILTER (
           WHERE wt.type = 'DEPOSIT' AND w.owner_type IN ('CUSTOMER', 'TASKER')
         ), 0)::numeric AS "totalDeposit",
         COALESCE(SUM(wt.amount) FILTER (
           WHERE wt.type = 'PAYMENT' AND w.owner_type = 'CUSTOMER'
         ), 0)::numeric AS "totalPayment",
         COALESCE(SUM(wt.amount) FILTER (
           WHERE wt.type = 'REFUND' AND w.owner_type = 'CUSTOMER'
         ), 0)::numeric AS "totalRefund",
         COALESCE(SUM(wt.amount) FILTER (
           WHERE wt.type = 'WITHDRAW' AND w.owner_type IN ('CUSTOMER', 'TASKER')
         ), 0)::numeric AS "totalWithdraw",
         COUNT(*) AS "totalTransactions"
       FROM wallet_transactions wt
       JOIN wallets w ON w.id = wt.wallet_id
       ${where}`,
      params,
    );

    return {
      totalDeposit: parseFloat(row.totalDeposit),
      totalPayment: parseFloat(row.totalPayment),
      totalRefund: parseFloat(row.totalRefund),
      totalWithdraw: parseFloat(row.totalWithdraw),
      totalTransactions: parseInt(row.totalTransactions, 10),
    };
  }

  async getRevenueSummary(
    query: RevenueQueryDto,
  ): Promise<RevenueSummaryResponseDto[]> {
    const {
      granularity = 'month',
      fromDate,
      toDate,
      taskerId,
      serviceId,
    } = query;

    const truncMap: Record<string, string> = {
      day: 'day',
      week: 'week',
      month: 'month',
    };
    const trunc = truncMap[granularity] ?? 'month';

    const fromTimestamp = fromDate ? new Date(fromDate).toISOString() : null;
    const toTimestamp = toDate
      ? new Date(
          toDate.includes('T') ? toDate : `${toDate}T23:59:59.999Z`,
        ).toISOString()
      : null;

    const params: (string | null)[] = [
      trunc,
      fromTimestamp,
      toTimestamp,
      taskerId ?? null,
      serviceId ?? null,
    ];

    const sql = `
      WITH booking_details AS (
        SELECT
          DATE_TRUNC($1, b.updated_at) AS period,
          b.id AS booking_id,
          COALESCE(b.total_price, 0)::numeric AS gross,
          COALESCE(
            wt_tasker.amount,
            (COALESCE(b.total_price, 0) - COALESCE(wt_fee.amount, 0))
          )::numeric AS tasker_earning,
          (
            COALESCE(b.total_price, 0) - 
            COALESCE(
              wt_tasker.amount,
              (COALESCE(b.total_price, 0) - COALESCE(wt_fee.amount, 0))
            )
          )::numeric AS platform_commission
        FROM bookings b
        LEFT JOIN (
          SELECT booking_id, SUM(amount) AS amount
          FROM wallet_transactions
          WHERE type = 'TASKER_EARNING'
            AND wallet_id IN (SELECT id FROM wallets WHERE owner_type = 'TASKER')
          GROUP BY booking_id
        ) wt_tasker ON wt_tasker.booking_id = b.id
        LEFT JOIN (
          SELECT booking_id, SUM(amount) AS amount
          FROM wallet_transactions
          WHERE type = 'PLATFORM_FEE'
            AND wallet_id IN (SELECT id FROM wallets WHERE owner_type = 'SYSTEM')
          GROUP BY booking_id
        ) wt_fee ON wt_fee.booking_id = b.id
        WHERE b.status = 'COMPLETED'
          AND ($2::timestamp IS NULL OR b.updated_at >= $2::timestamp)
          AND ($3::timestamp IS NULL OR b.updated_at <= $3::timestamp)
          AND ($4::uuid IS NULL OR b.tasker_id = $4::uuid)
          AND ($5::uuid IS NULL OR b.package_id = $5::uuid)
      )
      SELECT
        TO_CHAR(period, 'YYYY-MM-DD')         AS period,
        COALESCE(SUM(gross), 0)               AS "totalRevenue",
        COALESCE(SUM(platform_commission), 0) AS "totalPlatformCommission",
        COALESCE(SUM(tasker_earning), 0)      AS "totalTaskerEarnings",
        COUNT(DISTINCT booking_id)::int       AS "totalTransactions"
      FROM booking_details
      GROUP BY period
      ORDER BY period ASC
    `;

    const rows = await this.dataSource.query<RevenueSummaryResponseDto[]>(
      sql,
      params,
    );
    return rows;
  }

  async getRevenuePayroll(query: {
    page?: number;
    limit?: number;
    fromDate?: string;
    toDate?: string;
    taskerId?: string;
    serviceId?: string;
    search?: string;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const offset = (page - 1) * limit;

    const fromTimestamp = query.fromDate
      ? new Date(query.fromDate).toISOString()
      : null;
    const toTimestamp = query.toDate
      ? new Date(
          query.toDate.includes('T')
            ? query.toDate
            : `${query.toDate}T23:59:59.999Z`,
        ).toISOString()
      : null;
    const searchPattern = query.search?.trim()
      ? `%${query.search.trim()}%`
      : null;

    const params: (string | number | null)[] = [
      fromTimestamp,
      toTimestamp,
      query.taskerId ?? null,
      query.serviceId ?? null,
      searchPattern,
      limit,
      offset,
    ];

    const dataSql = `
      SELECT
        b.id                                      AS "bookingId",
        b.booking_code                            AS "bookingCode",
        b.updated_at                              AS "completedAt",
        cu.full_name                              AS "customerName",
        tu.full_name                              AS "taskerName",
        sp.name                                   AS "serviceName",
        sp.icon_url                               AS "serviceIconUrl",
        COALESCE(b.total_price, 0)::numeric       AS "totalPrice",
        COALESCE(
          wt_tasker.amount,
          (COALESCE(b.total_price, 0) - COALESCE(wt_fee.amount, 0))
        )::numeric AS "taskerEarning",
        (
          COALESCE(b.total_price, 0) - 
          COALESCE(
            wt_tasker.amount,
            (COALESCE(b.total_price, 0) - COALESCE(wt_fee.amount, 0))
          )
        )::numeric AS "platformCommission"
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      JOIN users cu ON c.user_id = cu.id
      LEFT JOIN taskers t ON b.tasker_id = t.id
      LEFT JOIN users tu ON t.user_id = tu.id
      LEFT JOIN service_packages sp ON b.package_id = sp.id
      LEFT JOIN (
        SELECT booking_id, SUM(amount) AS amount
        FROM wallet_transactions
        WHERE type = 'TASKER_EARNING'
          AND wallet_id IN (SELECT id FROM wallets WHERE owner_type = 'TASKER')
        GROUP BY booking_id
      ) wt_tasker ON wt_tasker.booking_id = b.id
      LEFT JOIN (
        SELECT booking_id, SUM(amount) AS amount
        FROM wallet_transactions
        WHERE type = 'PLATFORM_FEE'
          AND wallet_id IN (SELECT id FROM wallets WHERE owner_type = 'SYSTEM')
        GROUP BY booking_id
      ) wt_fee ON wt_fee.booking_id = b.id
      WHERE b.status = 'COMPLETED'
        AND ($1::timestamp IS NULL OR b.updated_at >= $1::timestamp)
        AND ($2::timestamp IS NULL OR b.updated_at <= $2::timestamp)
        AND ($3::uuid IS NULL OR b.tasker_id = $3::uuid)
        AND ($4::uuid IS NULL OR b.package_id = $4::uuid)
        AND ($5::text IS NULL OR b.booking_code ILIKE $5::text OR cu.full_name ILIKE $5::text OR tu.full_name ILIKE $5::text)
      ORDER BY b.updated_at DESC
      LIMIT $6 OFFSET $7
    `;

    const countSql = `
      SELECT COUNT(DISTINCT b.id)::int AS total
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      JOIN users cu ON c.user_id = cu.id
      LEFT JOIN taskers t ON b.tasker_id = t.id
      LEFT JOIN users tu ON t.user_id = tu.id
      WHERE b.status = 'COMPLETED'
        AND ($1::timestamp IS NULL OR b.updated_at >= $1::timestamp)
        AND ($2::timestamp IS NULL OR b.updated_at <= $2::timestamp)
        AND ($3::uuid IS NULL OR b.tasker_id = $3::uuid)
        AND ($4::uuid IS NULL OR b.package_id = $4::uuid)
        AND ($5::text IS NULL OR b.booking_code ILIKE $5::text OR cu.full_name ILIKE $5::text OR tu.full_name ILIKE $5::text)
    `;

    const [rows, countRows] = await Promise.all([
      this.dataSource.query<
        Array<{
          bookingId: string;
          bookingCode: string;
          completedAt: string;
          customerName: string;
          taskerName: string | null;
          serviceName: string | null;
          serviceIconUrl: string | null;
          totalPrice: string;
          taskerEarning: string;
          platformCommission: string;
        }>
      >(dataSql, params),
      this.dataSource.query<[{ total: number }]>(countSql, [
        fromTimestamp,
        toTimestamp,
        query.taskerId ?? null,
        query.serviceId ?? null,
        searchPattern,
      ]),
    ]);

    const total = countRows[0]?.total ?? 0;
    const items = rows.map((r) => ({
      bookingId: r.bookingId,
      bookingCode: r.bookingCode,
      completedAt: r.completedAt,
      customerName: r.customerName,
      taskerName: r.taskerName ?? 'Chưa gán',
      serviceName: r.serviceName ?? 'N/A',
      serviceIconUrl: r.serviceIconUrl ?? null,
      totalPrice: parseFloat(r.totalPrice),
      taskerEarning: parseFloat(r.taskerEarning),
      platformCommission: parseFloat(r.platformCommission),
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

@Injectable()
export class WithdrawalRequestRepository extends Repository<WithdrawalRequestEntity> {
  constructor(private readonly dataSource: DataSource) {
    super(WithdrawalRequestEntity, dataSource.createEntityManager());
  }

  async findWithPagination(
    query: WithdrawalListQueryDto,
  ): Promise<PaginatedData<WithdrawalRequestEntity>> {
    const { page = 1, limit = 20, status, taskerId, fromDate, toDate } = query;
    const skip = (page - 1) * limit;

    const qb = this.createQueryBuilder('wr')
      .leftJoinAndSelect('wr.wallet', 'w')
      .leftJoinAndSelect('wr.tasker', 'tasker')
      .leftJoinAndSelect('tasker.user', 'taskerUser')
      .orderBy('wr.createdAt', 'DESC');

    if (status) qb.andWhere('wr.status = :status', { status });
    if (taskerId) qb.andWhere('wr.taskerId = :taskerId', { taskerId });
    if (fromDate)
      qb.andWhere('wr.createdAt >= :fromDate', {
        fromDate: new Date(fromDate),
      });
    if (toDate)
      qb.andWhere('wr.createdAt <= :toDate', {
        toDate: new Date(toDate + 'T23:59:59'),
      });

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async countWeeklyWithdrawals(taskerId: string): Promise<number> {
    const result = await this.dataSource.query<[{ count: string }]>(
      `SELECT COUNT(*)::int AS count
       FROM tasker_withdrawal_requests
       WHERE tasker_id = $1
         AND status IN ('PENDING','APPROVED','PROCESSED')
         AND DATE_TRUNC('week', created_at) = DATE_TRUNC('week', ${VN_NOW_SQL})`,
      [taskerId],
    );
    return parseInt(result[0].count, 10);
  }
}
