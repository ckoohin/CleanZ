import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
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
import { IncidentResponsibilityParty } from 'src/common/enums/incident-responsibility-party.enum';

export enum IncidentDecisionDraftDecision {
  APPROVE = 'APPROVE',
  // P2 — công nhận sự cố nhưng không bồi thường (approved=0, không allocation, không strike).
  APPROVE_NO_COMPENSATION = 'APPROVE_NO_COMPENSATION',
  REJECT = 'REJECT',
}

export class DecisionDraftItemDto {
  @IsUUID('4')
  damageItemId!: string;

  @IsInt()
  @Min(0)
  approvedAmount!: number;
}

export class SaveIncidentDecisionDraftDto {
  @IsInt()
  @Min(0)
  expectedDecisionVersion!: number;

  @IsEnum(IncidentDecisionDraftDecision)
  decision!: IncidentDecisionDraftDecision;

  @ValidateIf(
    (o: SaveIncidentDecisionDraftDto) =>
      o.decision === IncidentDecisionDraftDecision.APPROVE,
  )
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DecisionDraftItemDto)
  items?: DecisionDraftItemDto[];

  @ValidateIf(
    (o: SaveIncidentDecisionDraftDto) =>
      o.decision === IncidentDecisionDraftDecision.APPROVE,
  )
  @IsEnum(IncidentResponsibilityParty)
  responsibilityParty?: IncidentResponsibilityParty;

  @ValidateIf(
    (o: SaveIncidentDecisionDraftDto) =>
      o.decision === IncidentDecisionDraftDecision.APPROVE,
  )
  @IsString()
  @MaxLength(1000)
  responsibilityReason?: string;

  @ValidateIf(
    (o: SaveIncidentDecisionDraftDto) =>
      o.decision === IncidentDecisionDraftDecision.APPROVE,
  )
  @IsInt()
  @Min(0)
  taskerBorneAmount?: number;

  @ValidateIf(
    (o: SaveIncidentDecisionDraftDto) =>
      o.decision === IncidentDecisionDraftDecision.APPROVE,
  )
  @IsInt()
  @Min(0)
  platformBorneAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  allocationReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  internalDecisionNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  taskerDecisionReason?: string;

  @IsString()
  @MaxLength(1000)
  customerDecisionSummary!: string;
}
