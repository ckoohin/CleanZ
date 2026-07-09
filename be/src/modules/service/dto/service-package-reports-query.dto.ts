import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ReportGroupBy {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

/**
 * Mọi field đều optional — "xem tất cả, không lọc gì" phải là trạng thái
 * hợp lệ cho 1 báo cáo tổng hợp toàn bộ gói dịch vụ. Lọc theo scheduled_start
 * (ngày làm việc thực tế của booking), không dùng created_at.
 */
export class ServicePackageReportsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  packageId?: string;

  @IsOptional()
  @IsUUID()
  taskerId?: string;
}

export class RevenueTrendQueryDto extends ServicePackageReportsQueryDto {
  @IsOptional()
  @IsEnum(ReportGroupBy)
  groupBy?: ReportGroupBy = ReportGroupBy.MONTH;
}

export class TopTaskersReportQueryDto extends ServicePackageReportsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
