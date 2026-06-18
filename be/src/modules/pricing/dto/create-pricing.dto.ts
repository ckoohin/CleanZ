import {
  IsUUID,
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

export class CreatePricingConfigDto {
  @ApiProperty({ example: 'uuid-of-service' })
  @IsUUID()
  serviceId!: string;

  @ApiProperty({
    example: '01',
    description: 'Province code (e.g. 01 = Hà Nội)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  provinceCode!: string;

  @ApiProperty({ example: 2.0 })
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.5)
  @Type(() => Number)
  durationHours!: number;

  @ApiProperty({ example: 180000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  basePrice!: number;

  @ApiPropertyOptional({ example: 220000 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  peakPrice?: number;

  @ApiPropertyOptional({ example: 30000, default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  petFee?: number;

  @ApiPropertyOptional({ example: 50000, default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  waitingFee?: number;

  @ApiPropertyOptional({
    example: 20.0,
    default: 20.0,
    description: 'Commission % (0–100)',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @Type(() => Number)
  platformCommissionRate?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
