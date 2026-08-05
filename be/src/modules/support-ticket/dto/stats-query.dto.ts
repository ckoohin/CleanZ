import { Transform } from 'class-transformer';
import { IsDateString, IsOptional } from 'class-validator';
import { resolveReportRange } from 'src/common/helpers/report-range.helper';

/** Khoảng thời gian mặc định khi admin không chọn (30 ngày gần nhất). */
export const STATS_DEFAULT_DAYS = 30;

export class StatsQueryDto {
  /**
   * Kỳ thống kê dạng 'YYYY-MM-DD'.
   *
   * Trước đây là `Date` thô: `new Date('2026-07-31')` là nửa đêm UTC = 07:00
   * sáng giờ VN, nên cận trên cắt mất gần trọn ngày cuối kỳ còn cận dưới ăn lẹm
   * 7 giờ của ngày hôm trước. Nhận chuỗi ngày rồi tự quy về biên giờ VN thì kỳ
   * mới đúng bằng những ngày admin chọn trên lịch.
   */
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : (value as string),
  )
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @Transform(({ value }) =>
    value === '' || value === null ? undefined : (value as string),
  )
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

/**
 * Quy kỳ lọc về cặp mốc `[from, to)` để đưa xuống SQL — cận trên KHÔNG BAO GỒM,
 * mọi nơi dùng phải so `created_at < to`. Logic dùng chung với các module báo
 * cáo khác, xem `resolveReportRange`.
 */
export function resolveStatsRange(query: StatsQueryDto): [Date, Date] {
  return resolveReportRange(query, STATS_DEFAULT_DAYS);
}
