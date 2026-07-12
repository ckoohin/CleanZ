import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateWithdrawalRequestDto {
  // Hạn mức min/max thật nằm ở system_configs (WITHDRAWAL_MIN_VND/WITHDRAWAL_MAX_VND),
  // service kiểm tra runtime — ở đây chỉ chặn số âm/0.
  @ApiProperty({ example: 500000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({ example: 'Rút thu nhập tuần này' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
