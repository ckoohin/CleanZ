import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePeakDayConfigDto {
  @ApiProperty({ example: 'Tết Nguyên Đán 2026' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: '2026-02-14T00:00:00.000Z' })
  @Type(() => Date)
  startAt!: Date;

  @ApiProperty({ example: '2026-02-22T23:59:59.000Z' })
  @Type(() => Date)
  endAt!: Date;

  @ApiProperty({
    example: 1.2,
    description: 'Price multiplier >= 1.0 (1.2 = +20%)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1.0)
  @Max(5.0)
  @Type(() => Number)
  peakRate!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
