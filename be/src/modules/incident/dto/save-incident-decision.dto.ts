import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { IC_INPUT_LIMITS } from '../incident.constants';
import { IncidentResponsibilityParty } from 'src/common/enums/incident-responsibility-party.enum';
import { IncidentDamageItemVerificationStatus } from 'src/common/enums/incident-damage-item-verification-status.enum';
import { IncidentDecisionOutcome } from 'src/common/enums/incident-decision-outcome.enum';

export { IncidentDecisionOutcome };

/** Kết quả thẩm định admin đặt cho từng hạng mục. PENDING không nhận từ client. */
export type DecisionItemVerification =
  | IncidentDamageItemVerificationStatus.VERIFIED
  | IncidentDamageItemVerificationStatus.REJECTED
  | IncidentDamageItemVerificationStatus.NEED_MORE_EVIDENCE;

/**
 * Một hạng mục trong quyết định. Gộp bước "thẩm định" và "duyệt tiền" cũ: admin chỉ nhập
 * MỘT con số. `verifiedAmount` trong DB được ghi bằng chính `approvedAmount` để giữ tương
 * thích cột cũ và phục vụ đối soát.
 */
export class DecisionItemDto {
  @IsUUID('4')
  damageItemId!: string;

  /** Trần chính sách áp cho TỔNG duyệt (`validate`); ở đây chỉ chặn số phi lý. */
  @IsInt()
  @Min(0)
  @Max(IC_INPUT_LIMITS.AMOUNT_SANITY_MAX)
  approvedAmount!: number;

  /** Bỏ trống → suy ra: approvedAmount > 0 ? VERIFIED : REJECTED. */
  @IsOptional()
  @IsEnum(IncidentDamageItemVerificationStatus)
  status?: DecisionItemVerification;
}

/**
 * Soạn / sửa quyết định sự cố — MỘT endpoint upsert thay cho cặp `decision-draft` +
 * `decision/revise` + `items/verify` cũ.
 */
export class SaveIncidentDecisionDto {
  @IsInt()
  @Min(0)
  expectedDecisionVersion!: number;

  @IsEnum(IncidentDecisionOutcome)
  outcome!: IncidentDecisionOutcome;

  @ValidateIf(
    (o: SaveIncidentDecisionDto) =>
      o.outcome === IncidentDecisionOutcome.COMPENSATE,
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(IC_INPUT_LIMITS.DAMAGE_ITEMS_MAX)
  @ValidateNested({ each: true })
  @Type(() => DecisionItemDto)
  items?: DecisionItemDto[];

  @ValidateIf(
    (o: SaveIncidentDecisionDto) =>
      o.outcome === IncidentDecisionOutcome.COMPENSATE,
  )
  @IsEnum(IncidentResponsibilityParty)
  responsibilityParty?: IncidentResponsibilityParty;

  @ValidateIf(
    (o: SaveIncidentDecisionDto) =>
      o.outcome === IncidentDecisionOutcome.COMPENSATE,
  )
  @IsString()
  @MaxLength(1000)
  responsibilityReason?: string;

  @ValidateIf(
    (o: SaveIncidentDecisionDto) =>
      o.outcome === IncidentDecisionOutcome.COMPENSATE,
  )
  @IsInt()
  @Min(0)
  @Max(IC_INPUT_LIMITS.AMOUNT_SANITY_MAX)
  taskerBorneAmount?: number;

  @ValidateIf(
    (o: SaveIncidentDecisionDto) =>
      o.outcome === IncidentDecisionOutcome.COMPENSATE,
  )
  @IsInt()
  @Min(0)
  @Max(IC_INPUT_LIMITS.AMOUNT_SANITY_MAX)
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

/** Gửi quyết định dự kiến cho Tasker phản biện. */
export class SendDecisionToTaskerDto {
  @IsInt()
  @Min(0)
  expectedDecisionVersion!: number;
}
