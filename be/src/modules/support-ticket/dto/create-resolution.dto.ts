import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ResolutionType } from 'src/common/enums/resolution-type.enum';

const MONEY_TYPES = [
  ResolutionType.REFUND,
  ResolutionType.COMPENSATION,
  ResolutionType.TASKER_PENALTY,
];

export class CreateResolutionDto {
  @IsEnum(ResolutionType)
  type!: ResolutionType;

  @ValidateIf((o: CreateResolutionDto) => MONEY_TYPES.includes(o.type))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsUUID('4')
  voucherId?: string;

  @IsOptional()
  @IsUUID('4')
  recleanBookingId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
