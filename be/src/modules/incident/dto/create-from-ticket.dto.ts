import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class FromTicketDamageItem {
  @IsString()
  @MaxLength(255)
  description!: string;

  @IsInt()
  @IsPositive()
  @Max(20_000_000)
  claimedAmount!: number;
}

export class CreateFromTicketDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsString()
  description!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FromTicketDamageItem)
  damageItems!: FromTicketDamageItem[];
}
