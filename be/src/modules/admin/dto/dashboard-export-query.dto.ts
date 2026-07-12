import { IsEnum } from 'class-validator';
import { DateRangeQueryDto } from './date-range-query.dto';

/**
 * Danh mục dashboard xuất được báo cáo. Không có 'services' — tab đó render
 * ServicePackageReportsPage và dùng bộ export riêng của module service.
 */
export enum DashboardCategory {
  OVERVIEW = 'overview',
  CS = 'cs',
  FINANCE = 'finance',
  OPERATIONS = 'operations',
  TASKER = 'tasker',
  MARKETING = 'marketing',
}

export enum DashboardExportMode {
  /** Mỗi mục một tab riêng. */
  MULTI = 'multi',
  /** Tất cả các mục xếp chồng trong một trang tính. */
  COMBINED = 'combined',
}

export class DashboardExportQueryDto extends DateRangeQueryDto {
  @IsEnum(DashboardCategory)
  category!: DashboardCategory;

  @IsEnum(DashboardExportMode)
  mode!: DashboardExportMode;
}
