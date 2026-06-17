import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import {
  IncidentEntity,
  IncidentStatus,
} from 'src/modules/incident/entity/incident.entity';
import {
  SupportTicketEntity,
  SupportTicketStatus,
} from 'src/modules/support-ticket/entity/support-ticket.entity';
import {
  WithdrawalEntity,
  WithdrawalStatus,
} from 'src/modules/withdrawal/entity/withdrawal.entity';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { TaskerStatus } from 'src/common/enums/tasker-status.enum';
import { DocumentStatus } from 'src/common/enums/document-status.enum';
import { TASKER_PRESENCE_STATUS } from 'src/common/enums/tasker-presence-status.enum';
import { GroupBy } from '../dto/date-range-query.dto';

@Injectable()
export class AdminDashboardRepository {
  constructor(private readonly dataSource: DataSource) {}

  async getAlerts() {
    const [
      unassigned,
      urgentUnassigned,
      pendingKyc,
      openIncidents,
      overdueIncidents,
      openTickets,
      slaBreached,
      pendingWithdrawals,
      withdrawalTotal,
    ] = await Promise.all([
      // Đơn chưa có tasker nhận
      this.dataSource
        .getRepository(BookingEntity)
        .createQueryBuilder('b')
        .where('b.status = :status', { status: BookingStatus.POSTED })
        .andWhere('b.tasker IS NULL')
        .getCount(),

      // Đơn chưa có tasker nhận sắp hết hạn (scheduled_start trong 2h)
      this.dataSource
        .getRepository(BookingEntity)
        .createQueryBuilder('b')
        .where('b.status = :status', { status: BookingStatus.POSTED })
        .andWhere('b.tasker IS NULL')
        .andWhere('b.scheduled_start <= :deadline', {
          deadline: new Date(Date.now() + 2 * 60 * 60 * 1000),
        })
        .getCount(),

      // Tasker chờ duyệt KYC
      this.dataSource
        .getRepository(TaskerEntity)
        .createQueryBuilder('t')
        .where('t.docStatus = :status', { status: DocumentStatus.PENDING })
        .getCount(),

      // Sự cố đang mở
      this.dataSource
        .getRepository(IncidentEntity)
        .createQueryBuilder('i')
        .where('i.status != :status', { status: IncidentStatus.RESOLVED })
        .getCount()
        .catch(() => 0),

      // Sự cố quá hạn
      this.dataSource
        .getRepository(IncidentEntity)
        .createQueryBuilder('i')
        .where('i.status != :status', { status: IncidentStatus.RESOLVED })
        .andWhere('i.overdueAt IS NOT NULL')
        .andWhere('i.overdueAt < :now', { now: new Date() })
        .getCount()
        .catch(() => 0),

      // Ticket đang mở
      this.dataSource
        .getRepository(SupportTicketEntity)
        .createQueryBuilder('t')
        .where('t.status != :status', { status: SupportTicketStatus.CLOSED })
        .getCount()
        .catch(() => 0),

      // Ticket vi phạm SLA
      this.dataSource
        .getRepository(SupportTicketEntity)
        .createQueryBuilder('t')
        .where('t.status != :status', { status: SupportTicketStatus.CLOSED })
        .andWhere('t.slaBreached = :breached', { breached: true })
        .getCount()
        .catch(() => 0),

      // Yêu cầu rút tiền chờ duyệt
      this.dataSource
        .getRepository(WithdrawalEntity)
        .createQueryBuilder('w')
        .where('w.status = :status', { status: WithdrawalStatus.PENDING })
        .getCount()
        .catch(() => 0),

      // Tổng tiền rút đang chờ
      this.dataSource
        .getRepository(WithdrawalEntity)
        .createQueryBuilder('w')
        .select('COALESCE(SUM(w.amount), 0)', 'total')
        .where('w.status = :status', { status: WithdrawalStatus.PENDING })
        .getRawOne()
        .then((r) => Number(r?.total ?? 0))
        .catch(() => 0),
    ]);

    return {
      unassignedBookings: { count: unassigned, urgentCount: urgentUnassigned },
      pendingKyc: { count: pendingKyc },
      openIncidents: { count: openIncidents, overdueCount: overdueIncidents },
      openTickets: { count: openTickets, slaBreachedCount: slaBreached },
      pendingWithdrawals: {
        count: pendingWithdrawals,
        totalAmount: withdrawalTotal,
      },
    };
  }

  async getKpis(from: Date, to: Date) {
    const diffMs = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - diffMs);
    const prevTo = new Date(from.getTime());

    const calcChange = (cur: number, prev: number) =>
      prev === 0 ? null : Math.round(((cur - prev) / prev) * 1000) / 10;

    const [
      cur,
      prev,
      activeTaskers,
      onlineTaskers,
      totalCustomers,
      returningCustomers,
    ] = await Promise.all([
      // Kỳ hiện tại
      this.dataSource
        .getRepository(BookingEntity)
        .createQueryBuilder('b')
        .select([
          'COALESCE(SUM(CASE WHEN b.status = :completed THEN b.total_price ELSE 0 END), 0) AS gmv',
          'COUNT(*) AS total_orders',
          'COUNT(CASE WHEN b.status IN (:...cancelled) THEN 1 END) AS cancelled_orders',
          'COALESCE(SUM(CASE WHEN b.payment_status = :refunded THEN b.total_price ELSE 0 END), 0) AS total_refund',
        ])
        .where('b.createdAt BETWEEN :from AND :to', { from, to })
        .setParameter('completed', BookingStatus.COMPLETED)
        .setParameter('cancelled', [
          BookingStatus.CANCELLED,
          BookingStatus.EXPIRED,
        ])
        .setParameter('refunded', 'REFUNDED')
        .getRawOne(),

      // Kỳ trước để tính % thay đổi
      this.dataSource
        .getRepository(BookingEntity)
        .createQueryBuilder('b')
        .select([
          'COALESCE(SUM(CASE WHEN b.status = :completed THEN b.total_price ELSE 0 END), 0) AS gmv',
          'COUNT(*) AS total_orders',
          'COUNT(CASE WHEN b.status IN (:...cancelled) THEN 1 END) AS cancelled_orders',
        ])
        .where('b.createdAt BETWEEN :from AND :to', {
          from: prevFrom,
          to: prevTo,
        })
        .setParameter('completed', BookingStatus.COMPLETED)
        .setParameter('cancelled', [
          BookingStatus.CANCELLED,
          BookingStatus.EXPIRED,
        ])
        .getRawOne(),

      // Tasker active (snapshot, không filter ngày)
      this.dataSource
        .getRepository(TaskerEntity)
        .createQueryBuilder('t')
        .where('t.status = :status', { status: TaskerStatus.ACTIVE })
        .getCount(),

      // Tasker online
      this.dataSource
        .getRepository(TaskerEntity)
        .createQueryBuilder('t')
        .where('t.status = :status', { status: TaskerStatus.ACTIVE })
        .andWhere('t.presenceStatus = :presence', {
          presence: TASKER_PRESENCE_STATUS.ONLINE,
        })
        .getCount(),

      // Khách hàng mới trong kỳ
      this.dataSource
        .getRepository(CustomerEntity)
        .createQueryBuilder('c')
        .where('c.createdAt BETWEEN :from AND :to', { from, to })
        .getCount(),

      // Khách quay lại (đặt >= 2 lần)
      this.dataSource
        .getRepository(CustomerEntity)
        .createQueryBuilder('c')
        .where('c.totalBookings >= 2')
        .getCount(),
    ]);

    const gmv = Number(cur.gmv);
    const prevGmv = Number(prev.gmv);
    const totalOrders = Number(cur.total_orders);
    const prevOrders = Number(prev.total_orders);
    const cancelledOrders = Number(cur.cancelled_orders);
    const prevCancelled = Number(prev.cancelled_orders);
    const cancelRate =
      totalOrders > 0
        ? Math.round((cancelledOrders / totalOrders) * 1000) / 10
        : 0;
    const prevCancelRate =
      prevOrders > 0 ? Math.round((prevCancelled / prevOrders) * 1000) / 10 : 0;
    const completedOrders = await this.dataSource
      .getRepository(BookingEntity)
      .createQueryBuilder('b')
      .where('b.status = :status', { status: BookingStatus.COMPLETED })
      .andWhere('b.createdAt BETWEEN :from AND :to', { from, to })
      .getCount();
    const aov = completedOrders > 0 ? Math.round(gmv / completedOrders) : 0;

    const prevNewCustomers = await this.dataSource
      .getRepository(CustomerEntity)
      .createQueryBuilder('c')
      .where('c.createdAt BETWEEN :from AND :to', {
        from: prevFrom,
        to: prevTo,
      })
      .getCount();

    return {
      gmv: { value: gmv, change: calcChange(gmv, prevGmv) },
      aov: { value: aov, change: null },
      totalOrders: {
        value: totalOrders,
        change: calcChange(totalOrders, prevOrders),
      },
      cancelRate: {
        value: cancelRate,
        change: calcChange(cancelRate, prevCancelRate),
      },
      newCustomers: {
        value: totalCustomers,
        change: calcChange(totalCustomers, prevNewCustomers),
      },
      returningRate: {
        value:
          totalCustomers > 0
            ? Math.round((returningCustomers / totalCustomers) * 1000) / 10
            : 0,
      },
      totalRefund: { value: Number(cur.total_refund), change: null },
      activeTaskers: { total: activeTaskers, online: onlineTaskers },
    };
  }

  async getGmvChart(from: Date, to: Date, groupBy: GroupBy) {
    const truncMap: Record<GroupBy, string> = {
      [GroupBy.DAY]: 'day',
      [GroupBy.WEEK]: 'week',
      [GroupBy.MONTH]: 'month',
    };
    const trunc = truncMap[groupBy];

    const rows = await this.dataSource
      .getRepository(BookingEntity)
      .createQueryBuilder('b')
      .select([
        `DATE_TRUNC('${trunc}', b.scheduled_start) AS period`,
        'COALESCE(SUM(b.total_price), 0) AS gmv',
        'COUNT(*) AS orders',
      ])
      .where('b.scheduled_start BETWEEN :from AND :to', { from, to })
      .groupBy(`DATE_TRUNC('${trunc}', b.scheduled_start)`)
      .orderBy(`DATE_TRUNC('${trunc}', b.scheduled_start)`, 'ASC')
      .getRawMany();

    return rows.map((r) => ({
      label: new Date(r.period).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        ...(groupBy === GroupBy.MONTH
          ? { month: 'short', day: undefined }
          : {}),
      }),
      gmv: Number(r.gmv),
      orders: Number(r.orders),
    }));
  }

  async getBookingStatusSnapshot() {
    const rows = await this.dataSource
      .getRepository(BookingEntity)
      .createQueryBuilder('b')
      .select(['b.status AS status', 'COUNT(*) AS count'])
      .groupBy('b.status')
      .getRawMany();

    const snapshot: Record<string, number> = {};
    for (const status of Object.values(BookingStatus)) {
      snapshot[status] = 0;
    }
    rows.forEach((r) => {
      snapshot[r.status] = Number(r.count);
    });
    return snapshot;
  }

  async getBookingDetails(from: Date, to: Date, limit: number) {
    const [recent, recurring, cancelReasons, peakHours] = await Promise.all([
      // Đơn gần đây
      this.dataSource
        .getRepository(BookingEntity)
        .createQueryBuilder('b')
        .leftJoin('b.customer', 'c')
        .leftJoin('c.user', 'u')
        .select([
          'b.booking_code AS "bookingCode"',
          'u.full_name AS "customerName"',
          'b.total_price AS "totalPrice"',
          'b.status AS status',
          'b.scheduled_start AS "scheduledStart"',
        ])
        .where('b.createdAt BETWEEN :from AND :to', { from, to })
        .orderBy('b.createdAt', 'DESC')
        .limit(limit)
        .getRawMany(),

      // Đơn định kỳ theo loại lịch
      this.dataSource
        .getRepository(BookingEntity)
        .createQueryBuilder('b')
        .select(['b.recurringRule AS rule', 'COUNT(*) AS count'])
        .where('b.isRecurring = true')
        .andWhere('b.createdAt BETWEEN :from AND :to', { from, to })
        .groupBy('b.recurringRule')
        .orderBy('count', 'DESC')
        .getRawMany(),

      // Lý do huỷ đơn
      this.dataSource
        .getRepository(BookingEntity)
        .createQueryBuilder('b')
        .select(['b.cancelled_by AS "cancelledBy"', 'COUNT(*) AS count'])
        .where('b.status IN (:...statuses)', {
          statuses: [BookingStatus.CANCELLED, BookingStatus.EXPIRED],
        })
        .andWhere('b.created_at BETWEEN :from AND :to', { from, to })
        .groupBy('b.cancelled_by')
        .orderBy('count', 'DESC')
        .getRawMany(),

      // Khung giờ cao điểm (nhóm theo 3h)
      this.dataSource
        .getRepository(BookingEntity)
        .createQueryBuilder('b')
        .select([
          `FLOOR(EXTRACT(HOUR FROM b.scheduled_start) / 3) * 3 AS hour_block`,
          'COUNT(*) AS count',
        ])
        .where('b.scheduled_start BETWEEN :from AND :to', { from, to })
        .groupBy('hour_block')
        .orderBy('hour_block', 'ASC')
        .getRawMany(),
    ]);

    const hourLabel = (block: number) => `${block}h-${block + 3}h`;

    return {
      recent: recent.map((r) => ({
        bookingCode: r.bookingCode,
        customerName: r.customerName,
        serviceName: null,
        totalPrice: Number(r.totalPrice),
        status: r.status,
        scheduledStart: r.scheduledStart,
      })),
      recurring: recurring.map((r) => ({
        rule: r.rule ?? 'Không xác định',
        count: Number(r.count),
      })),
      cancelReasons: cancelReasons.map((r) => ({
        cancelledBy: r.cancelledBy ?? 'SYSTEM',
        count: Number(r.count),
      })),
      peakHours: peakHours.map((r) => ({
        hour: hourLabel(Number(r.hour_block)),
        count: Number(r.count),
      })),
    };
  }

  async getFinanceBreakdown(from: Date, to: Date) {
    const [paymentRows, feeRow] = await Promise.all([
      this.dataSource
        .getRepository(BookingEntity)
        .createQueryBuilder('b')
        .select(['b.paymentMethod AS method', 'COUNT(*) AS count'])
        .where('b.createdAt BETWEEN :from AND :to', { from, to })
        .groupBy('b.paymentMethod')
        .orderBy('count', 'DESC')
        .getRawMany(),

      this.dataSource
        .getRepository(BookingEntity)
        .createQueryBuilder('b')
        .select([
          'COALESCE(SUM(b.peakFee), 0) AS peak_fee',
          'COALESCE(SUM(b.petFee), 0) AS pet_fee',
          'COALESCE(SUM(b.waitingFee), 0) AS waiting_fee',
          'COALESCE(SUM(b.discountAmount), 0) AS discount_amount',
        ])
        .where('b.createdAt BETWEEN :from AND :to', { from, to })
        .getRawOne(),
    ]);

    const totalOrders = paymentRows.reduce((s, r) => s + Number(r.count), 0);
    return {
      paymentMix: paymentRows.map((r) => ({
        method: r.method,
        count: Number(r.count),
        percent:
          totalOrders > 0
            ? Math.round((Number(r.count) / totalOrders) * 1000) / 10
            : 0,
      })),
      feeBreakdown: {
        peakFee: Number(feeRow?.peak_fee ?? 0),
        petFee: Number(feeRow?.pet_fee ?? 0),
        waitingFee: Number(feeRow?.waiting_fee ?? 0),
        discountAmount: Number(feeRow?.discount_amount ?? 0),
      },
    };
  }

  async getTaskerStats(limit: number) {
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [topTaskers, docExpiring] = await Promise.all([
      this.dataSource
        .getRepository(TaskerEntity)
        .createQueryBuilder('t')
        .leftJoin('t.user', 'u')
        .select([
          'u.fullName AS "fullName"',
          't.ratingAvg AS "ratingAvg"',
          't.totalCompletedJobs AS "totalCompletedJobs"',
        ])
        .where('t.status = :status', { status: TaskerStatus.ACTIVE })
        .orderBy('t.ratingAvg', 'DESC')
        .addOrderBy('t.totalCompletedJobs', 'DESC')
        .limit(limit)
        .getRawMany(),

      this.dataSource
        .getRepository(TaskerEntity)
        .createQueryBuilder('t')
        .leftJoin('t.user', 'u')
        .select([
          'u.fullName AS "fullName"',
          't.docType AS "docType"',
          't.docExpiredDate AS "docExpiredDate"',
        ])
        .where('t.docExpiredDate IS NOT NULL')
        .andWhere('t.docExpiredDate <= :deadline', {
          deadline: thirtyDaysLater,
        })
        .andWhere('t.docExpiredDate >= :now', { now: new Date() })
        .orderBy('t.docExpiredDate', 'ASC')
        .getRawMany(),
    ]);

    return {
      topTaskers: topTaskers.map((t) => ({
        fullName: t.fullName,
        ratingAvg: Number(t.ratingAvg),
        totalCompletedJobs: Number(t.totalCompletedJobs),
      })),
      docExpiring: docExpiring.map((t) => {
        const daysLeft = Math.ceil(
          (new Date(t.docExpiredDate).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        );
        return {
          fullName: t.fullName,
          docType: t.docType,
          docExpiredDate: t.docExpiredDate,
          daysLeft,
        };
      }),
    };
  }
}
