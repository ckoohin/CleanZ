import { IsEnum, IsOptional } from 'class-validator';
import { IncidentSeverity } from 'src/common/enums/incident-severity.enum';

export class AcceptIncidentDto {
  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;
}
