import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { IC_INPUT_LIMITS } from '../incident.constants';

export class FromTicketDamageItem {
  @IsString()
  @MaxLength(255)
  description!: string;

  /** Chặn số phi lý; trần chính sách áp cho TỔNG và do service kiểm. */
  @IsInt()
  @IsPositive()
  @Max(IC_INPUT_LIMITS.AMOUNT_SANITY_MAX)
  claimedAmount!: number;
}

export class CreateFromTicketDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsString()
  @MaxLength(IC_INPUT_LIMITS.DESCRIPTION_MAX)
  description!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(IC_INPUT_LIMITS.DAMAGE_ITEMS_MAX)
  @ValidateNested({ each: true })
  @Type(() => FromTicketDamageItem)
  damageItems!: FromTicketDamageItem[];
}
