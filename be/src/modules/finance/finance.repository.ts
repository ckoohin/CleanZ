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
    const { page = 1, limit = 20, walletId, type, fromDate, toDate } = query;
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
    if (type) qb.andWhere('wt.type = :type', { type });
    if (fromDate)
      qb.andWhere('wt.createdAt >= :fromDate', {
        fromDate: new Date(fromDate),
      });
    if (toDate)
      qb.andWhere('wt.createdAt <= :toDate', {
        toDate: new Date(toDate + 'T23:59:59'),
      });

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getRevenueSummary(
    query: RevenueQueryDto,
  ): Promise<RevenueSummaryResponseDto[]> {
    const { granularity = 'month', fromDate, toDate } = query;

    const truncMap: Record<string, string> = {
      day: 'day',
      week: 'week',
      month: 'month',
    };
    const trunc = truncMap[granularity] ?? 'month';

    // Mỗi lần chuyển tiền ghi 2 bút toán (một bên trừ, một bên cộng) với CÙNG loại.
    // Vì amount luôn lưu số dương, cộng cả hai vế sẽ nhân đôi số liệu — nên phải
    // lọc theo ví: doanh thu/hoa hồng lấy ở vế ví SYSTEM, thu nhập lấy ở vế ví TASKER.
    //
    // Hoa hồng = phí thu từ đơn tiền mặt (PLATFORM_FEE về SYSTEM)
    //          + phần còn lại của đơn trả bằng ví (tiền khách nạp vào SYSTEM
    //            trừ đi phần đã chi cho tasker và phần đã hoàn khách).
    const sql = `
      SELECT
        TO_CHAR(DATE_TRUNC($1, wt.created_at), 'YYYY-MM-DD') AS period,
        COALESCE(SUM(
          CASE
            WHEN w.owner_type = 'SYSTEM' AND wt.type = 'PAYMENT' THEN wt.amount
            WHEN w.owner_type = 'SYSTEM' AND wt.type = 'REFUND' THEN -wt.amount
            ELSE 0
          END
        ), 0) AS "totalRevenue",
        COALESCE(SUM(
          CASE
            WHEN w.owner_type = 'SYSTEM' AND wt.type IN ('PLATFORM_FEE', 'PAYMENT') THEN wt.amount
            WHEN w.owner_type = 'SYSTEM' AND wt.type IN ('TASKER_EARNING', 'REFUND') THEN -wt.amount
            ELSE 0
          END
        ), 0) AS "totalPlatformCommission",
        COALESCE(SUM(
          CASE WHEN w.owner_type = 'TASKER' AND wt.type = 'TASKER_EARNING' THEN wt.amount ELSE 0 END
        ), 0) AS "totalTaskerEarnings",
        COUNT(DISTINCT wt.booking_id) AS "totalTransactions"
      FROM wallet_transactions wt
      JOIN wallets w ON w.id = wt.wallet_id
      WHERE wt.type IN ('PAYMENT', 'PLATFORM_FEE', 'TASKER_EARNING', 'REFUND')
        ${fromDate ? `AND wt.created_at >= '${fromDate}'` : ''}
        ${toDate ? `AND wt.created_at <= '${toDate} 23:59:59'` : ''}
      GROUP BY DATE_TRUNC($1, wt.created_at)
      ORDER BY DATE_TRUNC($1, wt.created_at) ASC
    `;

    const rows = await this.dataSource.query<RevenueSummaryResponseDto[]>(sql, [
      trunc,
    ]);
    return rows;
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
         AND DATE_TRUNC('week', created_at) = DATE_TRUNC('week', NOW())`,
      [taskerId],
    );
    return parseInt(result[0].count, 10);
  }
}
