import { Injectable } from '@nestjs/common';
import { AdminDashboardRepository } from '../repositories/admin-dashboard.repository';
import { GroupBy } from '../dto/date-range-query.dto';
import { DashboardCategory } from '../dto/dashboard-export-query.dto';
import type { ExcelSheetSpec } from 'src/common/helpers/excel-report.helper';

/** Nhãn tiếng Việt của danh mục — dùng cho tiêu đề file và dòng "Bộ lọc áp dụng". */
export const CATEGORY_LABEL: Record<DashboardCategory, string> = {
  [DashboardCategory.OVERVIEW]: 'Tổng quan',
  [DashboardCategory.CS]: 'CS / Chăm sóc khách hàng',
  [DashboardCategory.FINANCE]: 'Tài chính',
  [DashboardCategory.OPERATIONS]: 'Vận hành',
  [DashboardCategory.TASKER]: 'Tasker',
  [DashboardCategory.MARKETING]: 'Marketing',
};

/** Nhãn cho các sheet chụp tại thời điểm xuất, không phụ thuộc kỳ đã chọn. */
const SNAPSHOT_NOTE =
  'Ảnh chụp tại thời điểm xuất — không phụ thuộc kỳ đã chọn.';

const VND = '#,##0" đ"';
const NUM = '#,##0';
/**
 * ExcelJS NHÂN giá trị ô với 100 khi numFmt là phần trăm. Repo trả phần trăm đã
 * nhân sẵn (12.5 nghĩa là 12.5%) nên mọi ô dùng format này phải được chia 100
 * trước — xem helper `frac()`.
 */
const PCT = '0.0%';
const RATING = '0.00';
const DATE = 'dd/mm/yyyy';
const DATETIME = 'dd/mm/yyyy hh:mm';

/** Đưa phần trăm dạng 12.5 về phân số 0.125 cho ExcelJS. */
const frac = (percent: number) => percent / 100;

/** Tỉ lệ phần của một dòng trên tổng, trả về phân số. */
const share = (value: number, total: number) => (total > 0 ? value / total : 0);

/** Ô "Thay đổi so với kỳ trước" — để dạng CHUỖI nên không dính bẫy nhân 100. */
const changeText = (change: number | null | undefined) => {
  if (change === null || change === undefined) return '—';
  if (change > 0) return `▲ ${change}%`;
  if (change < 0) return `▼ ${Math.abs(change)}%`;
  return '0%';
};

const fmtDay = (d: Date) => d.toLocaleDateString('vi-VN');

/** Đủ 9 trạng thái, xếp theo đúng vòng đời booking. */
const BOOKING_STATUS_LABEL: Record<string, string> = {
  POSTED: 'Đang tìm tasker (Posted)',
  PENDING_CUSTOMER_CONFIRMATION: 'Chờ khách xác nhận',
  CONFIRMED: 'Đã nhận đơn (Confirmed)',
  TASKER_ON_THE_WAY: 'Đang đến (On the way)',
  CHECKED_IN: 'Đã đến nơi (Checked in)',
  IN_PROGRESS: 'Đang làm (In progress)',
  COMPLETED: 'Hoàn tất (Completed)',
  CANCELLED: 'Đã huỷ (Cancelled)',
  EXPIRED: 'Hết hạn (Expired)',
};

const CANCELLED_BY_LABEL: Record<string, string> = {
  CUSTOMER: 'Khách huỷ (CUSTOMER)',
  TASKER: 'Tasker huỷ (TASKER)',
  SYSTEM: 'Hết hạn (SYSTEM)',
  ADMIN: 'Admin huỷ (ADMIN)',
};

/** Tập dữ liệu thô cần fetch cho một danh mục. Nhiều sheet dùng chung một lời gọi. */
interface ReportData {
  kpis?: Awaited<ReturnType<AdminDashboardRepository['getKpis']>>;
  alerts?: Awaited<ReturnType<AdminDashboardRepository['getAlerts']>>;
  gmvChart?: Awaited<ReturnType<AdminDashboardRepository['getGmvChart']>>;
  statuses?: Awaited<
    ReturnType<AdminDashboardRepository['getBookingStatusSnapshot']>
  >;
  bookings?: Awaited<ReturnType<AdminDashboardRepository['getBookingDetails']>>;
  finance?: Awaited<
    ReturnType<AdminDashboardRepository['getFinanceBreakdown']>
  >;
  taskers?: Awaited<ReturnType<AdminDashboardRepository['getTaskerStats']>>;
  reviews?: Awaited<ReturnType<AdminDashboardRepository['getReviews']>>;
  levels?: Awaited<ReturnType<AdminDashboardRepository['getTaskerLevels']>>;
  areas?: Awaited<ReturnType<AdminDashboardRepository['getAreaPerformance']>>;
  vouchers?: Awaited<
    ReturnType<AdminDashboardRepository['getVoucherPerformance']>
  >;
}

/** Sheet nào thuộc danh mục nào, theo đúng thứ tự widget hiển thị trên màn hình. */
type SheetKey =
  | 'kpi'
  | 'alerts'
  | 'gmvChart'
  | 'statuses'
  | 'recent'
  | 'recurring'
  | 'cancelReasons'
  | 'peakHours'
  | 'paymentMix'
  | 'feeBreakdown'
  | 'areaPerf'
  | 'topTaskers'
  | 'docExpiry'
  | 'taskerLevels'
  | 'reviews'
  | 'feedback'
  | 'voucherPerf';

const CATEGORY_SHEETS: Record<DashboardCategory, SheetKey[]> = {
  [DashboardCategory.OVERVIEW]: [
    'kpi',
    'alerts',
    'gmvChart',
    'reviews',
    'statuses',
    'recent',
  ],
  [DashboardCategory.CS]: ['alerts', 'recent', 'feedback', 'reviews', 'kpi'],
  [DashboardCategory.FINANCE]: [
    'kpi',
    'gmvChart',
    'paymentMix',
    'feeBreakdown',
  ],
  [DashboardCategory.OPERATIONS]: [
    'kpi',
    'alerts',
    'statuses',
    'areaPerf',
    'peakHours',
    'cancelReasons',
    'recurring',
    'topTaskers',
    'recent',
  ],
  [DashboardCategory.TASKER]: [
    'kpi',
    'taskerLevels',
    'topTaskers',
    'docExpiry',
  ],
  [DashboardCategory.MARKETING]: ['kpi', 'voucherPerf', 'areaPerf', 'gmvChart'],
};

/** KPI nào xuất hiện trong sheet "Chỉ số KPI" của từng danh mục. */
type KpiKey =
  | 'commission'
  | 'gmv'
  | 'aov'
  | 'refund'
  | 'orders'
  | 'cancelRate'
  | 'taskers'
  | 'newCustomers'
  | 'returningRate'
  | 'nps';

const CATEGORY_KPIS: Record<DashboardCategory, KpiKey[]> = {
  [DashboardCategory.OVERVIEW]: [
    'commission',
    'orders',
    'taskers',
    'cancelRate',
  ],
  [DashboardCategory.CS]: ['nps'],
  [DashboardCategory.FINANCE]: ['commission', 'gmv', 'refund', 'aov'],
  [DashboardCategory.OPERATIONS]: ['taskers'],
  [DashboardCategory.TASKER]: ['taskers'],
  [DashboardCategory.MARKETING]: ['newCustomers', 'returningRate'],
};

@Injectable()
export class AdminDashboardReportService {
  constructor(private readonly repo: AdminDashboardRepository) {}

  /**
   * Phải khớp y hệt `calcGroupBy` bên FE (fe/src/features/admin/lib/date-ranges.ts),
   * nếu không các mốc thời gian trong Excel sẽ lệch với biểu đồ trên màn hình.
   */
  private calcGroupBy(from: Date, to: Date): GroupBy {
    const days = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    if (days <= 14) return GroupBy.DAY;
    if (days <= 90) return GroupBy.WEEK;
    return GroupBy.MONTH;
  }

  getFilterSummary(category: DashboardCategory, from: Date, to: Date): string {
    return `Danh mục: ${CATEGORY_LABEL[category]} · Kỳ: ${fmtDay(from)} – ${fmtDay(to)}`;
  }

  getReportTitle(category: DashboardCategory): string {
    return `BÁO CÁO ${CATEGORY_LABEL[category].toUpperCase()}`;
  }

  async buildSheets(
    category: DashboardCategory,
    from: Date,
    to: Date,
  ): Promise<ExcelSheetSpec[]> {
    const keys = CATEGORY_SHEETS[category];
    const data = await this.fetch(keys, from, to);
    const filterSummary = this.getFilterSummary(category, from, to);

    const builders: Record<SheetKey, () => ExcelSheetSpec> = {
      kpi: () => this.kpiSheet(category, data),
      alerts: () => this.alertsSheet(data),
      gmvChart: () => this.gmvChartSheet(data, from, to),
      statuses: () => this.statusesSheet(data),
      recent: () => this.recentSheet(data),
      recurring: () => this.recurringSheet(data),
      cancelReasons: () => this.cancelReasonsSheet(data),
      peakHours: () => this.peakHoursSheet(data),
      paymentMix: () => this.paymentMixSheet(data),
      feeBreakdown: () => this.feeBreakdownSheet(data),
      areaPerf: () => this.areaPerfSheet(data),
      topTaskers: () => this.topTaskersSheet(data),
      docExpiry: () => this.docExpirySheet(data),
      taskerLevels: () => this.taskerLevelsSheet(data),
      reviews: () => this.reviewsSheet(data),
      feedback: () => this.feedbackSheet(data),
      voucherPerf: () => this.voucherPerfSheet(data),
    };

    return keys.map((key) => ({ ...builders[key](), filterSummary }));
  }

  /**
   * Gọi repo đúng MỘT lần cho mỗi nguồn dữ liệu, kể cả khi nhiều sheet cùng ăn
   * chung một lời gọi (bookings nuôi recent/recurring/cancelReasons/peakHours,
   * finance nuôi paymentMix + feeBreakdown, taskers nuôi topTaskers + docExpiry,
   * reviews nuôi reviews + feedback). Đây cũng là các hàm mà widget đang gọi —
   * điều kiện để số trong file khớp số trên màn hình.
   */
  private async fetch(
    keys: SheetKey[],
    from: Date,
    to: Date,
  ): Promise<ReportData> {
    const need = new Set(keys);
    const data: ReportData = {};
    const jobs: Promise<void>[] = [];

    const run = <K extends keyof ReportData>(
      key: K,
      p: Promise<ReportData[K]>,
    ) => {
      jobs.push(
        p.then((v) => {
          data[key] = v;
        }),
      );
    };

    if (need.has('kpi')) run('kpis', this.repo.getKpis(from, to));
    if (need.has('alerts')) run('alerts', this.repo.getAlerts());
    if (need.has('gmvChart')) {
      run(
        'gmvChart',
        this.repo.getGmvChart(from, to, this.calcGroupBy(from, to)),
      );
    }
    if (need.has('statuses')) {
      run('statuses', this.repo.getBookingStatusSnapshot());
    }
    if (
      need.has('recent') ||
      need.has('recurring') ||
      need.has('cancelReasons') ||
      need.has('peakHours')
    ) {
      // 50 đơn cho báo cáo (widget chỉ hiện 5) — subtitle của sheet nói rõ điều này.
      run('bookings', this.repo.getBookingDetails(from, to, 50));
    }
    if (need.has('paymentMix') || need.has('feeBreakdown')) {
      run('finance', this.repo.getFinanceBreakdown(from, to));
    }
    if (need.has('topTaskers') || need.has('docExpiry')) {
      run('taskers', this.repo.getTaskerStats(10));
    }
    if (need.has('reviews') || need.has('feedback')) {
      run('reviews', this.repo.getReviews(from, to, 20));
    }
    if (need.has('taskerLevels')) run('levels', this.repo.getTaskerLevels());
    if (need.has('areaPerf')) {
      run('areas', this.repo.getAreaPerformance(from, to, 20));
    }
    if (need.has('voucherPerf')) {
      run('vouchers', this.repo.getVoucherPerformance(20));
    }

    await Promise.all(jobs);
    return data;
  }

  // ─── Các hàm dựng sheet: thuần, chỉ map dữ liệu đã fetch ───

  private kpiSheet(
    category: DashboardCategory,
    data: ReportData,
  ): ExcelSheetSpec {
    const k = data.kpis;
    const rows: Record<string, unknown>[] = [];

    const push = (
      label: string,
      value: number,
      unit: string,
      change: number | null | undefined,
      note = '',
    ) => rows.push({ label, value, unit, change: changeText(change), note });

    if (k) {
      for (const key of CATEGORY_KPIS[category]) {
        switch (key) {
          case 'commission':
            push(
              'Doanh thu hoa hồng',
              k.commission.value,
              'đ',
              k.commission.change,
              'Hoa hồng nền tảng trên đơn hoàn tất',
            );
            break;
          case 'gmv':
            push(
              'GMV',
              k.gmv.value,
              'đ',
              k.gmv.change,
              'Tổng giá trị giao dịch của đơn hoàn tất',
            );
            break;
          case 'aov':
            push(
              'Giá trị đơn trung bình',
              k.aov.value,
              'đ',
              k.aov.change,
              'GMV / số đơn hoàn tất',
            );
            break;
          case 'refund':
            push('Tiền hoàn', k.totalRefund.value, 'đ', k.totalRefund.change);
            break;
          case 'orders':
            push(
              'Tổng đơn hàng',
              k.totalOrders.value,
              'đơn',
              k.totalOrders.change,
            );
            break;
          case 'cancelRate':
            push(
              'Tỉ lệ huỷ',
              k.cancelRate.value,
              '%',
              k.cancelRate.change,
              'Gồm cả đơn hết hạn',
            );
            break;
          case 'taskers':
            push(
              'Tasker đang online',
              k.activeTaskers.online,
              'người',
              null,
              `${SNAPSHOT_NOTE} Tổng tasker ACTIVE: ${k.activeTaskers.total}`,
            );
            break;
          case 'newCustomers':
            push(
              'Khách hàng mới',
              k.newCustomers.value,
              'khách',
              k.newCustomers.change,
            );
            break;
          case 'returningRate':
            push(
              'Tỉ lệ quay lại',
              k.returningRate.value,
              '%',
              null,
              'Khách có từ 2 đơn trở lên',
            );
            break;
          case 'nps':
            push(
              'NPS',
              k.nps.value,
              'điểm',
              null,
              `Promoter ${k.nps.promoterPct}% · Detractor ${k.nps.detractorPct}%`,
            );
            break;
        }
      }
    }

    return {
      name: 'Chỉ số KPI',
      title: `CHỈ SỐ KPI · ${CATEGORY_LABEL[category].toUpperCase()}`,
      subtitle:
        'Cột "Giá trị" là số thô; đơn vị nằm ở cột kế bên (tiền = đ, tỉ lệ = %).',
      columns: [
        { header: 'Chỉ số', key: 'label', width: 32 },
        { header: 'Giá trị', key: 'value', numFmt: NUM, alignRight: true },
        { header: 'Đơn vị', key: 'unit', width: 10 },
        { header: 'Thay đổi so với kỳ trước', key: 'change', alignRight: true },
        { header: 'Ghi chú', key: 'note', width: 44 },
      ],
      rows,
    };
  }

  private alertsSheet(data: ReportData): ExcelSheetSpec {
    const a = data.alerts;
    const rows = a
      ? [
          {
            label: 'Đơn chưa có tasker',
            count: a.unassignedBookings.count,
            level:
              a.unassignedBookings.urgentCount > 0 ? 'Khẩn' : 'Bình thường',
            note: `${a.unassignedBookings.urgentCount} đơn sắp tới giờ hẹn (trong 2h)`,
          },
          {
            label: 'Tasker chờ duyệt hồ sơ',
            count: a.pendingKyc.count,
            level: 'Cảnh báo',
            note: '',
          },
          {
            label: 'Sự cố đang mở',
            count: a.openIncidents.count,
            level: a.openIncidents.overdueCount > 0 ? 'Khẩn' : 'Cảnh báo',
            note: `${a.openIncidents.overdueCount} sự cố quá hạn ra quyết định`,
          },
          {
            label: 'Ticket hỗ trợ đang mở',
            count: a.openTickets.count,
            level: a.openTickets.slaBreachedCount > 0 ? 'Khẩn' : 'Cảnh báo',
            note: `${a.openTickets.slaBreachedCount} ticket vi phạm SLA`,
          },
          {
            label: 'Yêu cầu rút tiền chờ duyệt',
            count: a.pendingWithdrawals.count,
            level: 'Cảnh báo',
            note: `Tổng tiền chờ chi: ${a.pendingWithdrawals.totalAmount.toLocaleString('vi-VN')} đ`,
          },
        ]
      : [];

    return {
      name: 'Cảnh báo',
      title: 'VIỆC CẦN XỬ LÝ NGAY',
      subtitle: SNAPSHOT_NOTE,
      columns: [
        { header: 'Hạng mục', key: 'label', width: 30 },
        {
          header: 'Số lượng',
          key: 'count',
          numFmt: NUM,
          sumable: true,
          alignRight: true,
        },
        { header: 'Mức độ', key: 'level', width: 14 },
        { header: 'Ghi chú', key: 'note', width: 44 },
      ],
      rows,
    };
  }

  private gmvChartSheet(
    data: ReportData,
    from: Date,
    to: Date,
  ): ExcelSheetSpec {
    const points = data.gmvChart ?? [];
    const totalGmv = points.reduce((s, p) => s + p.gmv, 0);
    const groupLabel: Record<GroupBy, string> = {
      [GroupBy.DAY]: 'ngày',
      [GroupBy.WEEK]: 'tuần',
      [GroupBy.MONTH]: 'tháng',
    };

    return {
      name: 'GMV & số đơn',
      title: 'GMV & SỐ ĐƠN THEO THỜI GIAN',
      subtitle:
        `Nhóm theo ${groupLabel[this.calcGroupBy(from, to)]} · tính trên ngày hẹn làm của đơn. ` +
        'GMV chỉ gồm đơn HOÀN TẤT. "Đang xử lý" là đơn chưa chốt, "Thất thoát" là đơn huỷ/hết hạn — cả hai đều KHÔNG cộng vào GMV.',
      columns: [
        { header: 'Mốc thời gian', key: 'label', width: 16 },
        {
          header: 'GMV (đơn hoàn tất)',
          key: 'gmv',
          numFmt: VND,
          sumable: true,
          alignRight: true,
        },
        {
          header: 'Đang xử lý (chưa chốt)',
          key: 'pending',
          numFmt: VND,
          sumable: true,
          alignRight: true,
        },
        {
          header: 'Thất thoát (huỷ/hết hạn)',
          key: 'lost',
          numFmt: VND,
          sumable: true,
          alignRight: true,
        },
        {
          header: 'Số đơn',
          key: 'orders',
          numFmt: NUM,
          sumable: true,
          alignRight: true,
        },
        {
          header: 'GMV TB/đơn',
          key: 'avg',
          numFmt: VND,
          alignRight: true,
        },
        {
          header: '% trên tổng GMV',
          key: 'shareOfGmv',
          numFmt: PCT,
          alignRight: true,
        },
      ],
      rows: points.map((p) => ({
        label: p.label,
        gmv: p.gmv,
        pending: p.pending,
        lost: p.lost,
        orders: p.orders,
        avg: p.orders > 0 ? Math.round(p.gmv / p.orders) : 0,
        shareOfGmv: share(p.gmv, totalGmv),
      })),
    };
  }

  private statusesSheet(data: ReportData): ExcelSheetSpec {
    const s = data.statuses;
    // Đủ cả 9 trạng thái, đúng như BookingStatusWidget hiển thị — không gộp
    // CANCELLED/EXPIRED và không bỏ sót PENDING_CUSTOMER_CONFIRMATION.
    const rows = Object.keys(BOOKING_STATUS_LABEL).map((key) => ({
      label: BOOKING_STATUS_LABEL[key],
      count: s?.[key] ?? 0,
    }));
    const total = rows.reduce((sum, r) => sum + r.count, 0);

    return {
      name: 'Đơn theo trạng thái',
      title: 'ĐƠN THEO TRẠNG THÁI',
      subtitle: SNAPSHOT_NOTE,
      columns: [
        { header: 'Trạng thái', key: 'label', width: 36 },
        {
          header: 'Số đơn',
          key: 'count',
          numFmt: NUM,
          sumable: true,
          alignRight: true,
        },
        { header: 'Tỉ lệ', key: 'ratio', numFmt: PCT, alignRight: true },
      ],
      rows: rows.map((r) => ({ ...r, ratio: share(r.count, total) })),
    };
  }

  private recentSheet(data: ReportData): ExcelSheetSpec {
    const recent = data.bookings?.recent ?? [];
    return {
      name: 'Đơn hàng gần đây',
      title: 'ĐƠN HÀNG GẦN ĐÂY',
      subtitle:
        'Tối đa 50 đơn mới nhất trong kỳ (widget trên dashboard chỉ hiển thị 5 đơn đầu).',
      columns: [
        { header: 'Mã đơn', key: 'bookingCode', width: 18 },
        { header: 'Khách hàng', key: 'customerName', width: 26 },
        { header: 'Dịch vụ', key: 'serviceName', width: 26 },
        {
          header: 'Giá trị',
          key: 'totalPrice',
          numFmt: VND,
          sumable: true,
          alignRight: true,
        },
        { header: 'Trạng thái', key: 'status', width: 24 },
        { header: 'Lịch hẹn', key: 'scheduledStart', numFmt: DATETIME },
      ],
      rows: recent.map((b) => ({
        bookingCode: b.bookingCode,
        customerName: b.customerName ?? '—',
        serviceName: b.serviceName ?? '—',
        totalPrice: b.totalPrice,
        status: BOOKING_STATUS_LABEL[b.status] ?? b.status,
        scheduledStart: b.scheduledStart ? new Date(b.scheduledStart) : '',
      })),
    };
  }

  private recurringSheet(data: ReportData): ExcelSheetSpec {
    const items = data.bookings?.recurring ?? [];
    const total = items.reduce((s, r) => s + r.count, 0);
    return {
      name: 'Đơn định kỳ',
      title: 'ĐƠN ĐỊNH KỲ THEO LỊCH LẶP',
      columns: [
        { header: 'Lịch định kỳ', key: 'rule', width: 26 },
        {
          header: 'Số đơn',
          key: 'count',
          numFmt: NUM,
          sumable: true,
          alignRight: true,
        },
        { header: 'Tỉ lệ', key: 'ratio', numFmt: PCT, alignRight: true },
      ],
      rows: items.map((r) => ({
        rule: r.rule,
        count: r.count,
        ratio: share(r.count, total),
      })),
    };
  }

  private cancelReasonsSheet(data: ReportData): ExcelSheetSpec {
    const items = data.bookings?.cancelReasons ?? [];
    const total = items.reduce((s, r) => s + r.count, 0);
    return {
      name: 'Lý do huỷ đơn',
      title: 'ĐƠN HUỶ THEO BÊN HUỶ',
      columns: [
        { header: 'Bên huỷ', key: 'label', width: 26 },
        {
          header: 'Số đơn',
          key: 'count',
          numFmt: NUM,
          sumable: true,
          alignRight: true,
        },
        { header: 'Tỉ lệ', key: 'ratio', numFmt: PCT, alignRight: true },
      ],
      rows: items.map((r) => ({
        label: CANCELLED_BY_LABEL[r.cancelledBy] ?? r.cancelledBy,
        count: r.count,
        ratio: share(r.count, total),
      })),
    };
  }

  private peakHoursSheet(data: ReportData): ExcelSheetSpec {
    const items = data.bookings?.peakHours ?? [];
    const total = items.reduce((s, r) => s + r.count, 0);
    return {
      name: 'Khung giờ cao điểm',
      title: 'ĐƠN THEO KHUNG GIỜ',
      subtitle: 'Nhóm theo khối 3 giờ, tính trên lịch hẹn của đơn.',
      columns: [
        { header: 'Khung giờ', key: 'hour', width: 16 },
        {
          header: 'Số đơn',
          key: 'count',
          numFmt: NUM,
          sumable: true,
          alignRight: true,
        },
        { header: 'Tỉ lệ', key: 'ratio', numFmt: PCT, alignRight: true },
      ],
      rows: items.map((r) => ({
        hour: r.hour,
        count: r.count,
        ratio: share(r.count, total),
      })),
    };
  }

  private paymentMixSheet(data: ReportData): ExcelSheetSpec {
    const items = data.finance?.paymentMix ?? [];
    return {
      name: 'Cơ cấu thanh toán',
      title: 'CƠ CẤU THANH TOÁN THEO PHƯƠNG THỨC',
      columns: [
        { header: 'Phương thức', key: 'method', width: 22 },
        {
          header: 'Số đơn',
          key: 'count',
          numFmt: NUM,
          sumable: true,
          alignRight: true,
        },
        { header: 'Tỉ lệ', key: 'ratio', numFmt: PCT, alignRight: true },
      ],
      rows: items.map((p) => ({
        method: p.method ?? '—',
        count: p.count,
        ratio: frac(p.percent),
      })),
    };
  }

  private feeBreakdownSheet(data: ReportData): ExcelSheetSpec {
    const f = data.finance?.feeBreakdown;
    // Giảm giá để SỐ ÂM → dòng TỔNG CỘNG ra đúng phụ phí ròng.
    const rows = f
      ? [
          { label: 'Phụ phí cao điểm', amount: f.peakFee, note: '' },
          { label: 'Phụ phí thú cưng', amount: f.petFee, note: '' },
          { label: 'Phụ phí chờ đợi', amount: f.waitingFee, note: '' },
          {
            label: 'Giảm giá voucher',
            amount: -f.discountAmount,
            note: 'Ghi âm để dòng tổng ra phụ phí ròng',
          },
        ]
      : [];

    return {
      name: 'Phân tích phụ phí',
      title: 'PHÂN TÍCH PHỤ PHÍ & GIẢM GIÁ',
      columns: [
        { header: 'Khoản mục', key: 'label', width: 26 },
        {
          header: 'Số tiền',
          key: 'amount',
          numFmt: VND,
          sumable: true,
          alignRight: true,
        },
        { header: 'Ghi chú', key: 'note', width: 40 },
      ],
      rows,
    };
  }

  private areaPerfSheet(data: ReportData): ExcelSheetSpec {
    const items = data.areas ?? [];
    const total = items.reduce((s, r) => s + r.count, 0);
    return {
      name: 'Đơn theo khu vực',
      title: 'HIỆU SUẤT THEO KHU VỰC',
      columns: [
        { header: 'Khu vực', key: 'name', width: 28 },
        {
          header: 'Số đơn',
          key: 'count',
          numFmt: NUM,
          sumable: true,
          alignRight: true,
        },
        { header: 'Tỉ lệ', key: 'ratio', numFmt: PCT, alignRight: true },
      ],
      rows: items.map((a) => ({
        name: a.name,
        count: a.count,
        ratio: share(a.count, total),
      })),
    };
  }

  private topTaskersSheet(data: ReportData): ExcelSheetSpec {
    const items = data.taskers?.topTaskers ?? [];
    return {
      name: 'Top Tasker',
      title: 'BẢNG XẾP HẠNG TASKER',
      subtitle: SNAPSHOT_NOTE,
      columns: [
        {
          header: 'Hạng',
          key: 'rank',
          numFmt: NUM,
          alignRight: true,
          width: 8,
        },
        { header: 'Họ tên', key: 'fullName', width: 28 },
        {
          header: 'Điểm trung bình',
          key: 'ratingAvg',
          numFmt: RATING,
          alignRight: true,
        },
        {
          header: 'Số ca hoàn thành',
          key: 'totalCompletedJobs',
          numFmt: NUM,
          sumable: true,
          alignRight: true,
        },
      ],
      rows: items.map((t, i) => ({
        rank: i + 1,
        fullName: t.fullName ?? '—',
        ratingAvg: t.ratingAvg,
        totalCompletedJobs: t.totalCompletedJobs,
      })),
    };
  }

  private docExpirySheet(data: ReportData): ExcelSheetSpec {
    const items = data.taskers?.docExpiring ?? [];
    return {
      name: 'Giấy tờ sắp hết hạn',
      title: 'GIẤY TỜ TASKER SẮP HẾT HẠN',
      subtitle: `${SNAPSHOT_NOTE} Trong vòng 30 ngày tới.`,
      columns: [
        { header: 'Họ tên', key: 'fullName', width: 28 },
        { header: 'Loại giấy tờ', key: 'docType', width: 22 },
        { header: 'Ngày hết hạn', key: 'docExpiredDate', numFmt: DATE },
        {
          header: 'Còn lại (ngày)',
          key: 'daysLeft',
          numFmt: NUM,
          alignRight: true,
        },
      ],
      rows: items.map((d) => ({
        fullName: d.fullName ?? '—',
        docType: d.docType ?? '—',
        docExpiredDate: d.docExpiredDate ? new Date(d.docExpiredDate) : '',
        daysLeft: d.daysLeft,
      })),
    };
  }

  private taskerLevelsSheet(data: ReportData): ExcelSheetSpec {
    const items = data.levels ?? [];
    const total = items.reduce((s, r) => s + r.count, 0);
    return {
      name: 'Phân bố level Tasker',
      title: 'PHÂN BỐ TASKER THEO LEVEL',
      subtitle: `${SNAPSHOT_NOTE} Chỉ đếm tasker đang ACTIVE.`,
      columns: [
        { header: 'Level', key: 'label', width: 24 },
        {
          header: 'Số tasker',
          key: 'count',
          numFmt: NUM,
          sumable: true,
          alignRight: true,
        },
        { header: 'Tỉ lệ', key: 'ratio', numFmt: PCT, alignRight: true },
      ],
      rows: items.map((l) => ({
        label: l.label,
        count: l.count,
        ratio: share(l.count, total),
      })),
    };
  }

  private reviewsSheet(data: ReportData): ExcelSheetSpec {
    const r = data.reviews;
    const rows = r
      ? [
          {
            label: 'Điểm trung bình',
            value: r.avg,
            unit: '/ 5',
            note: '',
          },
          {
            label: 'Tổng lượt đánh giá',
            value: r.total,
            unit: 'lượt',
            note: '',
          },
          {
            label: 'NPS',
            value: r.nps,
            unit: 'điểm',
            note: 'Promoter (≥4.5 sao) trừ Detractor (≤3 sao)',
          },
          {
            label: 'Đúng giờ',
            value: r.criteria.punctuality,
            unit: '%',
            note: '',
          },
          {
            label: 'Sạch sẽ',
            value: r.criteria.cleanliness,
            unit: '%',
            note: '',
          },
          {
            label: 'Thân thiện',
            value: r.criteria.friendliness,
            unit: '%',
            note: '',
          },
          {
            label: 'Hài lòng',
            value: r.criteria.satisfaction,
            unit: '%',
            note: '',
          },
        ]
      : [];

    return {
      name: 'Đánh giá',
      title: 'CHẤT LƯỢNG DỊCH VỤ THEO ĐÁNH GIÁ',
      columns: [
        { header: 'Chỉ số', key: 'label', width: 24 },
        { header: 'Giá trị', key: 'value', numFmt: '0.0', alignRight: true },
        { header: 'Đơn vị', key: 'unit', width: 10 },
        { header: 'Ghi chú', key: 'note', width: 40 },
      ],
      rows,
    };
  }

  private feedbackSheet(data: ReportData): ExcelSheetSpec {
    const items = data.reviews?.recent ?? [];
    return {
      name: 'Feedback',
      title: 'FEEDBACK GẦN ĐÂY TỪ KHÁCH HÀNG',
      subtitle: 'Tối đa 20 nhận xét mới nhất có nội dung trong kỳ.',
      columns: [
        { header: 'Khách hàng', key: 'name', width: 26 },
        { header: 'Điểm', key: 'rating', numFmt: '0.0', alignRight: true },
        { header: 'Nội dung', key: 'comment', width: 60 },
      ],
      rows: items.map((f) => ({
        name: f.name ?? '—',
        rating: f.rating,
        comment: f.comment ?? '',
      })),
    };
  }

  private voucherPerfSheet(data: ReportData): ExcelSheetSpec {
    const items = data.vouchers ?? [];
    return {
      name: 'Hiệu quả voucher',
      title: 'HIỆU QUẢ VOUCHER',
      subtitle: `${SNAPSHOT_NOTE} Chỉ gồm voucher đang bật.`,
      columns: [
        { header: 'Mã voucher', key: 'code', width: 22 },
        {
          header: 'Lượt dùng',
          key: 'used',
          numFmt: NUM,
          sumable: true,
          alignRight: true,
        },
        { header: 'Giới hạn', key: 'limit', alignRight: true },
        { header: 'Tỉ lệ dùng', key: 'ratio', numFmt: PCT, alignRight: true },
      ],
      rows: items.map((v) => ({
        code: v.code,
        used: v.used,
        limit: v.limit === null ? 'Không giới hạn' : v.limit,
        ratio: v.limit ? share(v.used, v.limit) : 0,
      })),
    };
  }
}
