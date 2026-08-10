import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AuditSeverity } from 'src/common/enums/audit-severity.enum';
import { AdminActivityStatus } from '../entities/admin-activity-log.entity';

export class AdminActivityQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @IsOptional()
  @IsEnum(AdminActivityStatus)
  status?: AdminActivityStatus;

  @IsOptional()
  @IsEnum(AuditSeverity)
  severity?: AuditSeverity;

  /** Lọc đúng một loại nghiệp vụ, ví dụ `FINANCE.WALLET_MANUAL_ADJUSTMENT`. */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  actionCode?: string;

  /** Gom mọi thay đổi dữ liệu sinh ra từ cùng một thao tác admin. */
  @IsOptional()
  @IsUUID()
  correlationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  keyword?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
