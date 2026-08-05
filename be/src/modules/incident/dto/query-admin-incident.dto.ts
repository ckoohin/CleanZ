import { Transform } from 'class-transformer';
import {
  IsBooleanString,
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { QueryIncidentDto } from './query-incident.dto';
import { IncidentSeverity } from 'src/common/enums/incident-severity.enum';

export class QueryAdminIncidentDto extends QueryIncidentDto {
  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;

  @IsOptional()
  @IsUUID('4')
  taskerId?: string;

  @IsOptional()
  @IsUUID('4')
  customerId?: string;

  @IsOptional()
  @IsBooleanString()
  overdue?: string;

  @IsOptional()
  @IsIn(['severity', 'reportedAt', 'decisionDueAt'])
  sort?: 'severity' | 'reportedAt' | 'decisionDueAt';

  /**
   * Kỳ lọc theo NGÀY BÁO CÁO (`reported_at`), dạng 'YYYY-MM-DD', biên tính theo
   * giờ VN. Dùng chuỗi ngày chứ không phải `Date` vì cận trên phải là hết ngày
   * đó — nhận `Date` thô sẽ cắt mất gần trọn ngày cuối kỳ.
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
