import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsUUID,
  Min,
  Max,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PricingMode } from '../entity/pricing-tier.entity';

export class CreatePricingTierDto {
  @ApiProperty({ example: 'uuid-cua-goi-dich-vu' })
  @IsUUID()
  packageId!: string;

  @ApiProperty({ example: 'Nhà 60-100m²' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'Phù hợp căn hộ 2-3 phòng ngủ' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({
    enum: PricingMode,
    example: PricingMode.AREA_HOURLY,
    description: 'HOURLY | AREA_HOURLY | FIXED',
  })
  @IsEnum(PricingMode)
  pricingMode!: PricingMode;

  // ─── AREA_HOURLY ───────────────────────────────────────────────────────────
  @ApiPropertyOptional({
    example: 60,
    description: 'm² tối thiểu (AREA_HOURLY)',
  })
  @ValidateIf(
    (o: CreatePricingTierDto) => o.pricingMode === PricingMode.AREA_HOURLY,
  )
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Type(() => Number)
  areaMinM2?: number;

  @ApiPropertyOptional({ example: 100, description: 'm² tối đa (AREA_HOURLY)' })
  @ValidateIf(
    (o: CreatePricingTierDto) => o.pricingMode === PricingMode.AREA_HOURLY,
  )
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(1)
  @Type(() => Number)
  areaMaxM2?: number;

  @ApiPropertyOptional({
    example: 4500,
    description: 'Đơn giá / m² / giờ (AREA_HOURLY)',
  })
  @ValidateIf(
    (o: CreatePricingTierDto) => o.pricingMode === PricingMode.AREA_HOURLY,
  )
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  pricePerM2?: number;

  // ─── HOURLY ────────────────────────────────────────────────────────────────
  @ApiPropertyOptional({
    example: 150000,
    description: 'Đơn giá / giờ (HOURLY)',
  })
  @ValidateIf((o: CreatePricingTierDto) => o.pricingMode === PricingMode.HOURLY)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  pricePerHour?: number;

  // ─── FIXED ─────────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: 300000, description: 'Giá cố định (FIXED)' })
  @ValidateIf((o: CreatePricingTierDto) => o.pricingMode === PricingMode.FIXED)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  fixedPrice?: number;

  // ─── Common ────────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.5)
  @Max(24)
  @Type(() => Number)
  minHours?: number;

  @ApiPropertyOptional({ example: 8, default: 8 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.5)
  @Max(24)
  @Type(() => Number)
  maxHours?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.5)
  @Type(() => Number)
  defaultHours?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
