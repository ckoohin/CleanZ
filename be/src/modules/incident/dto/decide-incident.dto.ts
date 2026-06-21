import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export enum IncidentDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ApprovedItemInput {
  @IsUUID('4')
  itemId!: string;

  @IsInt()
  @Min(0)
  approvedAmount!: number;
}

export class DecideIncidentDto {
  @IsEnum(IncidentDecision)
  decision!: IncidentDecision;

  @ValidateIf((o: DecideIncidentDto) => o.decision === IncidentDecision.APPROVE)
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ApprovedItemInput)
  items?: ApprovedItemInput[];

  @ValidateIf((o: DecideIncidentDto) => o.decision === IncidentDecision.APPROVE)
  @IsInt()
  @Min(0)
  taskerBorneAmount?: number;

  @ValidateIf((o: DecideIncidentDto) => o.decision === IncidentDecision.APPROVE)
  @IsInt()
  @Min(0)
  platformBorneAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  allocationReason?: string;

  @ValidateIf((o: DecideIncidentDto) => o.decision === IncidentDecision.REJECT)
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsBoolean()
  rejectAsFraud?: boolean;
}
