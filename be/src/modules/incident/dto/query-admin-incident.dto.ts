import {
  IsBooleanString,
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
}
