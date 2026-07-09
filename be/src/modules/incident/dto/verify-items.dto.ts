import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { IncidentDamageItemVerificationStatus } from 'src/common/enums/incident-damage-item-verification-status.enum';

/** Kết quả thẩm định admin có thể đặt cho từng hạng mục (bỏ trống → suy từ verifiedAmount). */
export type VerifyItemDecision =
  | IncidentDamageItemVerificationStatus.VERIFIED
  | IncidentDamageItemVerificationStatus.REJECTED
  | IncidentDamageItemVerificationStatus.NEED_MORE_EVIDENCE;

export class VerifyItemInput {
  @IsUUID('4')
  itemId!: string;

  @IsInt()
  @Min(0)
  verifiedAmount!: number;

  @IsOptional()
  @IsEnum(IncidentDamageItemVerificationStatus)
  status?: VerifyItemDecision;
}

export class VerifyItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VerifyItemInput)
  items!: VerifyItemInput[];
}
