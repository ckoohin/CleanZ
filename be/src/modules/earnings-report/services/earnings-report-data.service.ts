import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  localDateKey,
  localMonthKey,
  resolveReportWindow,
  VIETNAM_UTC_OFFSET_MS,
  type EarningsReportPeriod,
} from 'src/common/helpers/earnings-period.helper';
import { roundVnd } from 'src/common/helpers/number.helper';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import {
  TaskerEarningsQueryService,
  type TaskerEarningsBookingRow,
} from 'src/modules/tasker/services/tasker-earnings-query.service';

export interface EarningsReportTaskerInfo {
  id: string;
  fullName: string;
  email: string;
  /** Đã che, chỉ còn 4 số cuối. `null` nếu Tasker chưa khai tài khoản. */
  bankAccountMasked: string | null;
  bankName: string | null;
}

export interface EarningsReportSummary {
  grossRevenue: number;
  platformFee: number;
  netIncome: number;
  completedBookings: number;
  avgPerBooking: number;
  commissionRatePercent: number;
  /** Số đơn chưa có bút toán quyết toán — tiền là ước tính. */
  estimatedBookings: number;
}

export interface EarningsReportDailyRow {
  key: string;
  label: string;
  bookings: number;
  grossRevenue: number;
  platformFee: number;
  netIncome: number;
}

export interface EarningsReportData {
  tasker: EarningsReportTaskerInfo;
  period: {
    type: EarningsReportPeriod;
    rangeLabel: string;
    periodStartKey: string;
    startAt: string;
    endAt: string;
    periodStart: Date;
    periodEnd: Date;
  };
  summary: EarningsReportSummary;
  daily: EarningsReportDailyRow[];
  bookings: TaskerEarningsBookingRow[];
  generatedAt: Date;
}

/** Che số tài khoản, chỉ giữ 4 số cuối: `1234567890` → `••••7890`. */
function maskAccount(value?: string | null): string | null {
  const digits = (value ?? '').trim();
  if (!digits) return null;
  if (digits.length <= 4) return digits;
  return `••••${digits.slice(-4)}`;
}

/**
 * Gom dữ liệu cho bảng kê thu nhập một Tasker trong một kỳ.
 *
 * Mốc tính là `bookings.completedAt` (đúng ngữ nghĩa "đơn hoàn thành trong kỳ"),
 * KHÁC với màn hình in-app vốn tính theo `wallet_transactions.createdAt`. Đơn hoàn
 * thành cuối kỳ nhưng quyết toán sang kỳ sau sẽ rơi vào hai kỳ khác nhau ở hai
 * nơi — ghi chú trong PDF nói rõ mốc tính để tránh hiểu nhầm.
 */
@Injectable()
export class EarningsReportDataService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly earningsQuery: TaskerEarningsQueryService,
  ) {}

  async build(
    taskerId: string,
    period: EarningsReportPeriod,
    anchorLocalMs: number,
    now = new Date(),
  ): Promise<EarningsReportData> {
    const tasker = await this.dataSource
      .getRepository(TaskerEntity)
      .createQueryBuilder('t')
      .innerJoin('t.user', 'u')
      .select('t.id', 'id')
      .addSelect('u.full_name', 'fullName')
      .addSelect('u.email', 'email')
      .addSelect('t.bank_name', 'bankName')
      .addSelect('t.bank_account_number', 'bankAccountNumber')
      .where('t.id = :taskerId', { taskerId })
      .getRawOne<{
        id: string;
        fullName: string;
        email: string;
        bankName: string | null;
        bankAccountNumber: string | null;
      }>();

    if (!tasker) throw new NotFoundException('Không tìm thấy tasker');

    const window = resolveReportWindow(period, anchorLocalMs);
    const bookings = await this.earningsQuery.findCompletedBookings(taskerId, {
      from: window.startAt,
      to: window.endAt,
    });

    return {
      tasker: {
        id: tasker.id,
        fullName: tasker.fullName,
        email: tasker.email,
        bankName: tasker.bankName,
        bankAccountMasked: maskAccount(tasker.bankAccountNumber),
      },
      period: {
        type: period,
        rangeLabel: window.rangeLabel,
        periodStartKey: window.periodStartKey,
        startAt: window.startAt,
        endAt: window.endAt,
        periodStart: window.periodStart,
        periodEnd: window.periodEnd,
      },
      summary: this.summarize(bookings),
      daily: this.groupByBucket(bookings, period),
      bookings,
      generatedAt: now,
    };
  }

  private summarize(rows: TaskerEarningsBookingRow[]): EarningsReportSummary {
    const grossRevenue = roundVnd(
      rows.reduce((sum, row) => sum + row.subtotal, 0),
    );
    const platformFee = roundVnd(
      rows.reduce((sum, row) => sum + row.platformCommission, 0),
    );
    const netIncome = roundVnd(
      rows.reduce((sum, row) => sum + row.taskerEarning, 0),
    );

    return {
      grossRevenue,
      platformFee,
      netIncome,
      completedBookings: rows.length,
      avgPerBooking: rows.length > 0 ? Math.round(netIncome / rows.length) : 0,
      commissionRatePercent:
        grossRevenue > 0
          ? Number(((platformFee / grossRevenue) * 100).toFixed(2))
          : 0,
      estimatedBookings: rows.filter((row) => row.isEstimated).length,
    };
  }

  /**
   * Gom nhóm theo ngày (kỳ tuần/tháng) hoặc theo tháng (kỳ năm).
   *
   * Cố ý gom trong JS chứ không `DATE_TRUNC` trong SQL: phí nền tảng của từng đơn
   * được suy ra từ bút toán ví qua `resolveBookingPaymentBreakdown` (logic TS),
   * nên một truy vấn GROUP BY riêng sẽ cho ra con số khác bảng chi tiết. Gom từ
   * chính các dòng đã tính đảm bảo bảng diễn biến luôn cộng đúng bằng bảng chi tiết.
   */
  private groupByBucket(
    rows: TaskerEarningsBookingRow[],
    period: EarningsReportPeriod,
  ): EarningsReportDailyRow[] {
    const buckets = new Map<string, EarningsReportDailyRow>();

    for (const row of rows) {
      if (!row.completedAt) continue;
      // Cột `completed_at` đã lưu theo giờ VN; cộng offset để `getUTC*` đọc đúng.
      const local = new Date(
        new Date(row.completedAt).getTime() + VIETNAM_UTC_OFFSET_MS,
      );
      const key =
        period === 'year' ? localMonthKey(local) : localDateKey(local);
      const label =
        period === 'year'
          ? `Tháng ${local.getUTCMonth() + 1}/${local.getUTCFullYear()}`
          : `${String(local.getUTCDate()).padStart(2, '0')}/${String(
              local.getUTCMonth() + 1,
            ).padStart(2, '0')}`;

      const bucket = buckets.get(key) ?? {
        key,
        label,
        bookings: 0,
        grossRevenue: 0,
        platformFee: 0,
        netIncome: 0,
      };
      bucket.bookings += 1;
      bucket.grossRevenue += row.subtotal;
      bucket.platformFee += row.platformCommission;
      bucket.netIncome += row.taskerEarning;
      buckets.set(key, bucket);
    }

    return [...buckets.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((bucket) => ({
        ...bucket,
        grossRevenue: roundVnd(bucket.grossRevenue),
        platformFee: roundVnd(bucket.platformFee),
        netIncome: roundVnd(bucket.netIncome),
      }));
  }
}
