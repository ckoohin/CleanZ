import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateWithdrawalRequestDto {
  @ApiProperty({ example: 500000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(10000)
  amount!: number;

  @ApiPropertyOptional({ example: 'Rút thu nhập tuần này' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
