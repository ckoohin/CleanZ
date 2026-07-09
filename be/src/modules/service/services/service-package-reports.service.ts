import { Injectable } from '@nestjs/common';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { BookingAddonEntity } from 'src/modules/booking/entity/booking-addon.entity';
import { ServicePackageEntity } from '../entity/service-package.entity';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import {
  ReportGroupBy,
  RevenueTrendQueryDto,
  ServicePackageReportsQueryDto,
  TopTaskersReportQueryDto,
} from '../dto/service-package-reports-query.dto';

@Injectable()
export class ServicePackageReportsService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Áp các filter chung (khoảng ngày theo scheduled_start, packageId, taskerId)
   * lên 1 QueryBuilder có alias là bảng bookings (trực tiếp hoặc qua join).
   * Luôn gọi hàm này TRƯỚC các .andWhere() khác trong cùng query — vì nó gọi
   * .where() (reset điều kiện), gọi sau sẽ xoá mất điều kiện đã set trước đó.
   */
  private applyFilters(
    qb: SelectQueryBuilder<any>,
    filter: ServicePackageReportsQueryDto,
    alias: string,
  ): void {
    qb.where('1=1');
    if (filter.from) {
      qb.andWhere(`${alias}.scheduled_start >= :from`, { from: filter.from });
    }
    if (filter.to) {
      qb.andWhere(`${alias}.scheduled_start <= :to`, { to: filter.to });
    }
    if (filter.packageId) {
      qb.andWhere(`${alias}.package_id = :packageId`, {
        packageId: filter.packageId,
      });
    }
    if (filter.taskerId) {
      qb.andWhere(`${alias}.tasker_id = :taskerId`, {
        taskerId: filter.taskerId,
      });
    }
  }

  async getOverview(filter: ServicePackageReportsQueryDto) {
    const qb = this.dataSource
      .getRepository(BookingEntity)
      .createQueryBuilder('b');
    this.applyFilters(qb, filter, 'b');
    qb.select([
      'COUNT(*) AS "totalBookings"',
      'COALESCE(SUM(CASE WHEN b.status = :completed THEN b.total_price ELSE 0 END), 0) AS "totalRevenue"',
      'COUNT(CASE WHEN b.status = :completed THEN 1 END) AS "completedBookings"',
      'COUNT(CASE WHEN b.status IN (:...cancelledSet) THEN 1 END) AS "cancelledBookings"',
      'COUNT(DISTINCT b.package_id) AS "activePackagesCount"',
    ])
      .setParameter('completed', BookingStatus.COMPLETED)
      .setParameter('cancelledSet', [
        BookingStatus.CANCELLED,
        BookingStatus.EXPIRED,
      ]);

    const row = await qb.getRawOne();
    return {
      totalBookings: Number(row?.totalBookings ?? 0),
      totalRevenue: Number(row?.totalRevenue ?? 0),
      completedBookings: Number(row?.completedBookings ?? 0),
      cancelledBookings: Number(row?.cancelledBookings ?? 0),
      activePackagesCount: Number(row?.activePackagesCount ?? 0),
    };
  }

  async getRevenueTrend(filter: RevenueTrendQueryDto) {
    const groupBy = filter.groupBy ?? ReportGroupBy.MONTH;
    const qb = this.dataSource
      .getRepository(BookingEntity)
      .createQueryBuilder('b');
    this.applyFilters(qb, filter, 'b');
    qb.andWhere('b.scheduled_start IS NOT NULL')
      .select([
        `DATE_TRUNC('${groupBy}', b.scheduled_start) AS period`,
        'COALESCE(SUM(CASE WHEN b.status = :completed THEN b.total_price ELSE 0 END), 0) AS revenue',
        'COUNT(*) AS bookings',
      ])
      .setParameter('completed', BookingStatus.COMPLETED)
      .groupBy(`DATE_TRUNC('${groupBy}', b.scheduled_start)`)
      .orderBy(`DATE_TRUNC('${groupBy}', b.scheduled_start)`, 'ASC');

    const rows = await qb.getRawMany();
    return rows.map((r) => ({
      period: r.period,
      label: new Date(r.period).toLocaleDateString('vi-VN', {
        day: groupBy === ReportGroupBy.MONTH ? undefined : '2-digit',
        month: groupBy === ReportGroupBy.MONTH ? 'short' : '2-digit',
        year: groupBy === ReportGroupBy.MONTH ? 'numeric' : undefined,
      }),
      revenue: Number(r.revenue),
      bookings: Number(r.bookings),
    }));
  }

  async getRevenueByPackage(filter: ServicePackageReportsQueryDto) {
    const joinConditions: string[] = ['b.package_id = pkg.id'];
    const joinParams: Record<string, unknown> = {};
    if (filter.from) {
      joinConditions.push('b.scheduled_start >= :from');
      joinParams.from = filter.from;
    }
    if (filter.to) {
      joinConditions.push('b.scheduled_start <= :to');
      joinParams.to = filter.to;
    }
    if (filter.taskerId) {
      joinConditions.push('b.tasker_id = :taskerId');
      joinParams.taskerId = filter.taskerId;
    }

    const qb = this.dataSource
      .getRepository(ServicePackageEntity)
      .createQueryBuilder('pkg')
      .leftJoin('bookings', 'b', joinConditions.join(' AND '))
      .select([
        'pkg.id AS "id"',
        'pkg.name AS "name"',
        'COUNT(b.id) AS "bookings"',
        'COALESCE(SUM(CASE WHEN b.status = :completed THEN b.total_price ELSE 0 END), 0) AS "revenue"',
      ])
      .setParameter('completed', BookingStatus.COMPLETED)
      .setParameters(joinParams);

    if (filter.packageId) {
      qb.where('pkg.id = :packageId', { packageId: filter.packageId });
    }

    qb.groupBy('pkg.id').addGroupBy('pkg.name').orderBy('"revenue"', 'DESC');

    const rows = await qb.getRawMany();
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      bookings: Number(r.bookings),
      revenue: Number(r.revenue),
    }));
  }

  async getBookingStatusBreakdown(filter: ServicePackageReportsQueryDto) {
    const qb = this.dataSource
      .getRepository(BookingEntity)
      .createQueryBuilder('b');
    this.applyFilters(qb, filter, 'b');
    qb.select(['b.status AS status', 'COUNT(*) AS count']).groupBy(
      'b.status',
    );

    const rows = await qb.getRawMany();
    const snapshot: Record<string, number> = {};
    for (const status of Object.values(BookingStatus)) {
      snapshot[status] = 0;
    }
    rows.forEach((r) => {
      snapshot[r.status] = Number(r.count);
    });
    return snapshot;
  }

  async getHourlyDistribution(filter: ServicePackageReportsQueryDto) {
    const qb = this.dataSource
      .getRepository(BookingEntity)
      .createQueryBuilder('b');
    this.applyFilters(qb, filter, 'b');
    qb.andWhere('b.scheduled_start IS NOT NULL')
      .select([
        'EXTRACT(HOUR FROM b.scheduled_start)::int AS hour',
        'COUNT(*) AS bookings',
        'COALESCE(SUM(b.total_price), 0) AS revenue',
      ])
      .groupBy('hour')
      .orderBy('hour', 'ASC');

    const rows = await qb.getRawMany();
    const byHour = new Map<number, { bookings: number; revenue: number }>();
    rows.forEach((r) =>
      byHour.set(Number(r.hour), {
        bookings: Number(r.bookings),
        revenue: Number(r.revenue),
      }),
    );

    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      bookings: byHour.get(hour)?.bookings ?? 0,
      revenue: byHour.get(hour)?.revenue ?? 0,
    }));
  }

  async getAddonPopularity(filter: ServicePackageReportsQueryDto) {
    const qb = this.dataSource
      .getRepository(BookingAddonEntity)
      .createQueryBuilder('ba')
      .innerJoin('ba.booking', 'b');
    this.applyFilters(qb, filter, 'b');
    qb.select([
      'ba.addon_id AS "addonId"',
      'ba.name AS "name"',
      'COUNT(*) AS "timesUsed"',
      'COALESCE(SUM(ba.price), 0) AS "revenue"',
    ])
      .groupBy('ba.addon_id')
      .addGroupBy('ba.name')
      .orderBy('"timesUsed"', 'DESC')
      .limit(15);

    const rows = await qb.getRawMany();
    return rows.map((r) => ({
      addonId: r.addonId,
      name: r.name,
      timesUsed: Number(r.timesUsed),
      revenue: Number(r.revenue),
    }));
  }

  async getDurationPopularity(filter: ServicePackageReportsQueryDto) {
    const qb = this.dataSource
      .getRepository(BookingEntity)
      .createQueryBuilder('b')
      .innerJoin('service_packages', 'pkg', 'pkg.id = b.package_id')
      .leftJoin(
        'service_durations',
        'sd',
        'sd.package_id = b.package_id AND sd.duration_hours = b.duration_hours',
      );
    this.applyFilters(qb, filter, 'b');
    qb.select([
      'b.package_id AS "packageId"',
      'pkg.name AS "packageName"',
      'b.duration_hours AS "durationHours"',
      `COALESCE(sd.title, CONCAT(b.duration_hours, 'h')) AS "title"`,
      'COALESCE(sd.is_popular, false) AS "isPopular"',
      'COUNT(*) AS "bookings"',
      'COALESCE(SUM(b.total_price), 0) AS "revenue"',
    ])
      .groupBy('b.package_id')
      .addGroupBy('pkg.name')
      .addGroupBy('b.duration_hours')
      .addGroupBy('sd.title')
      .addGroupBy('sd.is_popular')
      .orderBy('"bookings"', 'DESC')
      .limit(20);

    const rows = await qb.getRawMany();
    return rows.map((r) => ({
      packageId: r.packageId,
      packageName: r.packageName,
      durationHours: Number(r.durationHours),
      title: r.title,
      isPopular: Boolean(r.isPopular),
      bookings: Number(r.bookings),
      revenue: Number(r.revenue),
    }));
  }

  async getTopTaskers(filter: TopTaskersReportQueryDto) {
    const qb = this.dataSource
      .getRepository(BookingEntity)
      .createQueryBuilder('b')
      .innerJoin('b.tasker', 't')
      .innerJoin('t.user', 'u');
    this.applyFilters(qb, filter, 'b');
    qb.andWhere('b.tasker_id IS NOT NULL')
      .select([
        't.id AS "taskerId"',
        'u.full_name AS "fullName"',
        'u.phone AS "phoneNumber"',
        'COUNT(CASE WHEN b.status = :completed THEN 1 END) AS "completedJobs"',
        'COALESCE(SUM(CASE WHEN b.status = :completed THEN b.total_price ELSE 0 END), 0) AS "revenue"',
      ])
      .setParameter('completed', BookingStatus.COMPLETED)
      .groupBy('t.id')
      .addGroupBy('u.full_name')
      .addGroupBy('u.phone')
      .orderBy('"completedJobs"', 'DESC')
      .limit(filter.limit ?? 10);

    const rows = await qb.getRawMany();
    return rows.map((r) => ({
      taskerId: r.taskerId,
      fullName: r.fullName,
      phoneNumber: r.phoneNumber,
      completedJobs: Number(r.completedJobs),
      revenue: Number(r.revenue),
    }));
  }

  // ─── Excel sheet builders — mỗi hàm trả về 1 ExcelSheetSpec đầy đủ chi tiết
  // (tiêu đề, mô tả, bộ lọc áp dụng, cột %/TB tính sẵn, dòng TỔNG CỘNG có công
  // thức SUM thật) — dùng chung cho export riêng từng mục và export tổng hợp
  // nhiều sheet. Không trả số liệu trần trụi — luôn kèm ngữ cảnh để nhân viên
  // đọc/đối chiếu/tính toán tiếp ngay trên Excel mà không cần hỏi lại. ───

  private readonly VND_FMT = '#,##0" đ"';
  private readonly PCT_FMT = '0.0%';

  private async getFilterSummaryText(
    filter: ServicePackageReportsQueryDto,
  ): Promise<string> {
    const parts: string[] = [];

    parts.push(
      filter.from || filter.to
        ? `Từ ${filter.from ? new Date(filter.from).toLocaleDateString('vi-VN') : '…'} đến ${filter.to ? new Date(filter.to).toLocaleDateString('vi-VN') : '…'}`
        : 'Toàn bộ thời gian',
    );

    if (filter.packageId) {
      const rows = await this.dataSource.query(
        'SELECT name FROM service_packages WHERE id = $1',
        [filter.packageId],
      );
      parts.push(`Gói dịch vụ: ${rows[0]?.name ?? filter.packageId}`);
    } else {
      parts.push('Gói dịch vụ: Tất cả');
    }

    if (filter.taskerId) {
      const rows = await this.dataSource.query(
        `SELECT u.full_name AS name FROM taskers t JOIN users u ON u.id = t.user_id WHERE t.id = $1`,
        [filter.taskerId],
      );
      parts.push(`Tasker: ${rows[0]?.name ?? filter.taskerId}`);
    } else {
      parts.push('Tasker: Tất cả');
    }

    return parts.join('  ·  ');
  }

  /** Public wrapper — controller cần chuỗi bộ lọc này để dựng banner cho file gộp 1 sheet. */
  async getExportFilterSummary(
    filter: ServicePackageReportsQueryDto,
  ): Promise<string> {
    return this.getFilterSummaryText(filter);
  }

  async buildOverviewSheet(filter: ServicePackageReportsQueryDto) {
    const d = await this.getOverview(filter);
    const completionRate =
      d.totalBookings > 0 ? d.completedBookings / d.totalBookings : 0;
    const cancellationRate =
      d.totalBookings > 0 ? d.cancelledBookings / d.totalBookings : 0;
    const avgOrderValue =
      d.completedBookings > 0
        ? Math.round(d.totalRevenue / d.completedBookings)
        : 0;

    return {
      name: 'Tổng quan',
      title: 'BÁO CÁO TỔNG QUAN GÓI DỊCH VỤ',
      subtitle:
        'Các chỉ số cốt lõi về booking và doanh thu trong phạm vi bộ lọc đang áp dụng.',
      filterSummary: await this.getFilterSummaryText(filter),
      columns: [
        { header: 'Chỉ số', key: 'label', width: 32 },
        { header: 'Giá trị', key: 'value', width: 20, numFmt: '#,##0', alignRight: true },
        { header: 'Đơn vị', key: 'unit', width: 12 },
        { header: 'Ghi chú', key: 'note', width: 44 },
      ],
      rows: [
        { label: 'Tổng số booking', value: d.totalBookings, unit: 'đơn', note: 'Toàn bộ booking khớp bộ lọc, mọi trạng thái' },
        { label: 'Tổng doanh thu', value: d.totalRevenue, unit: 'đ', note: 'Chỉ tính booking đã hoàn thành' },
        { label: 'Booking hoàn thành', value: d.completedBookings, unit: 'đơn', note: `Tỉ lệ hoàn thành: ${(completionRate * 100).toFixed(1)}%` },
        { label: 'Booking đã huỷ/hết hạn', value: d.cancelledBookings, unit: 'đơn', note: `Tỉ lệ huỷ: ${(cancellationRate * 100).toFixed(1)}%` },
        { label: 'Giá trị đơn trung bình', value: avgOrderValue, unit: 'đ', note: 'Doanh thu / số booking hoàn thành' },
        { label: 'Số gói dịch vụ đang hoạt động', value: d.activePackagesCount, unit: 'gói', note: 'Có ít nhất 1 booking khớp bộ lọc' },
      ],
    };
  }

  async buildRevenueTrendSheet(filter: RevenueTrendQueryDto) {
    const rows = await this.getRevenueTrend(filter);
    const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
    let cumulative = 0;
    const groupByLabel =
      { day: 'ngày', week: 'tuần', month: 'tháng' }[
        filter.groupBy ?? ReportGroupBy.MONTH
      ] ?? 'tháng';

    return {
      name: 'Xu hướng doanh thu',
      title: 'BÁO CÁO XU HƯỚNG DOANH THU',
      subtitle: `Doanh thu và số booking theo từng ${groupByLabel}, sắp xếp theo thời gian tăng dần.`,
      filterSummary: await this.getFilterSummaryText(filter),
      columns: [
        { header: 'Mốc thời gian', key: 'label', width: 18 },
        { header: 'Doanh thu', key: 'revenue', width: 18, numFmt: this.VND_FMT, sumable: true, alignRight: true },
        { header: 'Số booking', key: 'bookings', width: 14, sumable: true, alignRight: true },
        { header: 'Doanh thu TB/booking', key: 'avgPerBooking', width: 20, numFmt: this.VND_FMT, alignRight: true },
        { header: '% trên tổng doanh thu', key: 'pctOfTotal', width: 18, numFmt: this.PCT_FMT, alignRight: true },
        { header: 'Doanh thu cộng dồn', key: 'cumulative', width: 20, numFmt: this.VND_FMT, alignRight: true },
      ],
      rows: rows.map((r) => {
        cumulative += r.revenue;
        return {
          label: r.label,
          revenue: r.revenue,
          bookings: r.bookings,
          avgPerBooking: r.bookings > 0 ? Math.round(r.revenue / r.bookings) : 0,
          pctOfTotal: totalRevenue > 0 ? r.revenue / totalRevenue : 0,
          cumulative,
        };
      }),
    };
  }

  async buildRevenueByPackageSheet(filter: ServicePackageReportsQueryDto) {
    const rows = await this.getRevenueByPackage(filter);
    const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);

    return {
      name: 'Doanh thu theo gói',
      title: 'BÁO CÁO DOANH THU THEO GÓI DỊCH VỤ',
      subtitle:
        'Bao gồm cả những gói dịch vụ chưa phát sinh booking nào trong phạm vi bộ lọc (hiện giá trị 0).',
      filterSummary: await this.getFilterSummaryText(filter),
      columns: [
        { header: 'STT', key: 'stt', width: 6, alignRight: true },
        { header: 'Gói dịch vụ', key: 'name', width: 32 },
        { header: 'Số booking', key: 'bookings', width: 14, sumable: true, alignRight: true },
        { header: 'Doanh thu', key: 'revenue', width: 18, numFmt: this.VND_FMT, sumable: true, alignRight: true },
        { header: 'Doanh thu TB/booking', key: 'avgPerBooking', width: 20, numFmt: this.VND_FMT, alignRight: true },
        { header: '% trên tổng doanh thu', key: 'pctOfTotal', width: 18, numFmt: this.PCT_FMT, alignRight: true },
      ],
      rows: rows.map((r, i) => ({
        stt: i + 1,
        name: r.name,
        bookings: r.bookings,
        revenue: r.revenue,
        avgPerBooking: r.bookings > 0 ? Math.round(r.revenue / r.bookings) : 0,
        pctOfTotal: totalRevenue > 0 ? r.revenue / totalRevenue : 0,
      })),
    };
  }

  async buildBookingStatusSheet(filter: ServicePackageReportsQueryDto) {
    const snapshot = await this.getBookingStatusBreakdown(filter);
    const labels: Record<string, string> = {
      POSTED: 'Vừa đăng',
      PENDING_CUSTOMER_CONFIRMATION: 'Chờ khách xác nhận',
      CONFIRMED: 'Đã xác nhận',
      TASKER_ON_THE_WAY: 'Tasker đang đến',
      CHECKED_IN: 'Đã check-in',
      IN_PROGRESS: 'Đang thực hiện',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Đã huỷ',
      EXPIRED: 'Hết hạn',
    };
    const total = Object.values(snapshot).reduce((s, c) => s + c, 0);

    return {
      name: 'Trạng thái booking',
      title: 'BÁO CÁO PHÂN BỔ TRẠNG THÁI BOOKING',
      subtitle: 'Số lượng và tỉ lệ booking theo từng trạng thái trong vòng đời đơn hàng.',
      filterSummary: await this.getFilterSummaryText(filter),
      columns: [
        { header: 'Trạng thái', key: 'label', width: 26 },
        { header: 'Số lượng', key: 'count', width: 14, sumable: true, alignRight: true },
        { header: 'Tỉ lệ', key: 'pct', width: 14, numFmt: this.PCT_FMT, alignRight: true },
      ],
      rows: Object.entries(snapshot).map(([status, count]) => ({
        label: labels[status] ?? status,
        count,
        pct: total > 0 ? count / total : 0,
      })),
    };
  }

  async buildHourlyDistributionSheet(filter: ServicePackageReportsQueryDto) {
    const rows = await this.getHourlyDistribution(filter);
    const totalBookings = rows.reduce((s, r) => s + r.bookings, 0);
    const peakHours = new Set(
      [...rows]
        .sort((a, b) => b.bookings - a.bookings)
        .slice(0, 3)
        .filter((r) => r.bookings > 0)
        .map((r) => r.hour),
    );

    return {
      name: 'Phân bố theo giờ',
      title: 'BÁO CÁO PHÂN BỐ BOOKING THEO GIỜ TRONG NGÀY',
      subtitle: 'Theo giờ làm việc thực tế (scheduled_start) — đủ 24 giờ, kể cả giờ không có booking.',
      filterSummary: await this.getFilterSummaryText(filter),
      columns: [
        { header: 'Giờ', key: 'hourLabel', width: 10 },
        { header: 'Số booking', key: 'bookings', width: 14, sumable: true, alignRight: true },
        { header: 'Doanh thu', key: 'revenue', width: 18, numFmt: this.VND_FMT, sumable: true, alignRight: true },
        { header: '% trên tổng booking', key: 'pctOfTotal', width: 18, numFmt: this.PCT_FMT, alignRight: true },
        { header: 'Doanh thu TB/booking', key: 'avgPerBooking', width: 20, numFmt: this.VND_FMT, alignRight: true },
        { header: 'Khung giờ cao điểm', key: 'isPeak', width: 18 },
      ],
      rows: rows.map((r) => ({
        hourLabel: `${r.hour}h - ${r.hour + 1}h`,
        bookings: r.bookings,
        revenue: r.revenue,
        pctOfTotal: totalBookings > 0 ? r.bookings / totalBookings : 0,
        avgPerBooking: r.bookings > 0 ? Math.round(r.revenue / r.bookings) : 0,
        isPeak: peakHours.has(r.hour) ? 'Top 3 cao điểm' : '',
      })),
    };
  }

  async buildAddonPopularitySheet(filter: ServicePackageReportsQueryDto) {
    const rows = await this.getAddonPopularity(filter);
    const totalUsed = rows.reduce((s, r) => s + r.timesUsed, 0);

    return {
      name: 'Dịch vụ thêm phổ biến',
      title: 'BÁO CÁO DỊCH VỤ THÊM (ADDON) PHỔ BIẾN',
      subtitle:
        'Doanh thu/giá addon là snapshot tại thời điểm đặt — chính xác cả khi addon sau này đổi giá hoặc bị xoá. Chỉ tính từ booking tạo sau khi tính năng này triển khai.',
      filterSummary: await this.getFilterSummaryText(filter),
      columns: [
        { header: 'STT', key: 'stt', width: 6, alignRight: true },
        { header: 'Tên addon', key: 'name', width: 30 },
        { header: 'Số lần dùng', key: 'timesUsed', width: 14, sumable: true, alignRight: true },
        { header: 'Doanh thu', key: 'revenue', width: 18, numFmt: this.VND_FMT, sumable: true, alignRight: true },
        { header: 'Đơn giá trung bình', key: 'avgPrice', width: 18, numFmt: this.VND_FMT, alignRight: true },
        { header: '% trên tổng lượt dùng', key: 'pctOfTotal', width: 18, numFmt: this.PCT_FMT, alignRight: true },
      ],
      rows: rows.map((r, i) => ({
        stt: i + 1,
        name: r.name,
        timesUsed: r.timesUsed,
        revenue: r.revenue,
        avgPrice: r.timesUsed > 0 ? Math.round(r.revenue / r.timesUsed) : 0,
        pctOfTotal: totalUsed > 0 ? r.timesUsed / totalUsed : 0,
      })),
    };
  }

  async buildDurationPopularitySheet(filter: ServicePackageReportsQueryDto) {
    const rows = await this.getDurationPopularity(filter);
    const totalBookings = rows.reduce((s, r) => s + r.bookings, 0);

    return {
      name: 'Mốc thời lượng phổ biến',
      title: 'BÁO CÁO MỐC THỜI LƯỢNG PHỔ BIẾN',
      subtitle: 'Số booking và doanh thu theo từng mốc thời lượng của mỗi gói dịch vụ.',
      filterSummary: await this.getFilterSummaryText(filter),
      columns: [
        { header: 'STT', key: 'stt', width: 6, alignRight: true },
        { header: 'Gói dịch vụ', key: 'packageName', width: 28 },
        { header: 'Mốc thời lượng', key: 'title', width: 20 },
        { header: 'Được đánh dấu phổ biến', key: 'isPopularLabel', width: 20 },
        { header: 'Số booking', key: 'bookings', width: 14, sumable: true, alignRight: true },
        { header: 'Doanh thu', key: 'revenue', width: 18, numFmt: this.VND_FMT, sumable: true, alignRight: true },
        { header: 'Doanh thu TB/booking', key: 'avgPerBooking', width: 20, numFmt: this.VND_FMT, alignRight: true },
        { header: '% trên tổng booking', key: 'pctOfTotal', width: 18, numFmt: this.PCT_FMT, alignRight: true },
      ],
      rows: rows.map((r, i) => ({
        stt: i + 1,
        packageName: r.packageName,
        title: r.title,
        isPopularLabel: r.isPopular ? 'Có' : 'Không',
        bookings: r.bookings,
        revenue: r.revenue,
        avgPerBooking: r.bookings > 0 ? Math.round(r.revenue / r.bookings) : 0,
        pctOfTotal: totalBookings > 0 ? r.bookings / totalBookings : 0,
      })),
    };
  }

  async buildTopTaskersSheet(filter: TopTaskersReportQueryDto) {
    const rows = await this.getTopTaskers(filter);
    const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);

    return {
      name: 'Bảng xếp hạng Tasker',
      title: 'BÁO CÁO BẢNG XẾP HẠNG TASKER',
      subtitle: `Top ${rows.length} tasker theo số việc hoàn thành, kèm doanh thu tạo ra và hiệu suất trung bình.`,
      filterSummary: await this.getFilterSummaryText(filter),
      columns: [
        { header: 'Hạng', key: 'rank', width: 8, alignRight: true },
        { header: 'Tasker', key: 'fullName', width: 28 },
        { header: 'SĐT', key: 'phoneNumber', width: 16 },
        { header: 'Việc hoàn thành', key: 'completedJobs', width: 16, sumable: true, alignRight: true },
        { header: 'Doanh thu tạo ra', key: 'revenue', width: 20, numFmt: this.VND_FMT, sumable: true, alignRight: true },
        { header: 'Doanh thu TB/việc', key: 'avgPerJob', width: 18, numFmt: this.VND_FMT, alignRight: true },
        { header: '% trên tổng doanh thu', key: 'pctOfTotal', width: 18, numFmt: this.PCT_FMT, alignRight: true },
      ],
      rows: rows.map((r, i) => ({
        rank: i + 1,
        fullName: r.fullName,
        phoneNumber: r.phoneNumber,
        completedJobs: r.completedJobs,
        revenue: r.revenue,
        avgPerJob: r.completedJobs > 0 ? Math.round(r.revenue / r.completedJobs) : 0,
        pctOfTotal: totalRevenue > 0 ? r.revenue / totalRevenue : 0,
      })),
    };
  }
}
