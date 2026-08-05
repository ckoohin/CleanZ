import { OmitType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsOptional } from 'class-validator';
import { resolveReportRange } from 'src/common/helpers/report-range.helper';
import { QueryAdminIncidentDto } from './query-admin-incident.dto';

/** Kỳ mặc định khi admin không chọn ngày (giống báo cáo phiếu hỗ trợ). */
export const INCIDENT_REPORT_DEFAULT_DAYS = 30;

/**
 * Bộ lọc khi xuất DANH SÁCH sự cố: y hệt hàng đợi nhưng bỏ phân trang — file
 * phải chứa trọn tập khớp bộ lọc, không phải mỗi trang admin đang xem.
 */
export class ExportIncidentListDto extends OmitType(QueryAdminIncidentDto, [
  'page',
  'limit',
] as const) {}

/** Xuất BÁO CÁO chỉ cần kỳ thống kê — không có bộ lọc nào khác. */
export class ExportIncidentReportDto {
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

/** Cặp mốc `[from, to)` cho báo cáo — cận trên KHÔNG bao gồm, luôn so `< to`. */
export function resolveIncidentReportRange(
  query: ExportIncidentReportDto,
): [Date, Date] {
  return resolveReportRange(query, INCIDENT_REPORT_DEFAULT_DAYS);
}
