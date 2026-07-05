import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  IsArray,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PricingMode } from '../../pricing/entity/pricing-tier.entity';

export class CreateServicePackageDto {
  @ApiProperty({ example: 'Dọn dẹp nhà cửa' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'SRV-PKG-01' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  packageCode?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/icon.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  iconUrl?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 8.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  maxHours?: number;

  @ApiPropertyOptional({ example: 'Điều khoản sử dụng...' })
  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @ApiPropertyOptional({ example: 'Chính sách hủy đơn...' })
  @IsOptional()
  @IsString()
  policyDescription?: string;

  @ApiPropertyOptional({ example: 50000.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  nightSurcharge?: number;

  @ApiPropertyOptional({ example: 30000.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  petSurcharge?: number;

  @ApiPropertyOptional({ example: 20000.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  waitingSurcharge?: number;

  @ApiPropertyOptional({ example: 40000.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  toolFee?: number;

  @ApiPropertyOptional({ example: 15.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  peakRatePercent?: number;

  @ApiPropertyOptional({ enum: PricingMode, example: PricingMode.HOURLY })
  @IsOptional()
  @IsEnum(PricingMode)
  pricingMode?: PricingMode;

  @ApiPropertyOptional({ example: ['uuid-area-1', 'uuid-area-2'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coverageAreaIds?: string[];

  @ApiPropertyOptional({ example: ['https://cdn.example.com/img1.jpg'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  galleryUrls?: string[];

  @ApiPropertyOptional({ example: 100000 })
  @IsOptional()
  @IsNumber()
  baseHourlyRate?: number;

  @ApiPropertyOptional({ example: 120000 })
  @IsOptional()
  @IsNumber()
  premiumHourlyRate?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  allowMultipleTaskers?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  allowSubscription?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  allowSingleService?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  durations?: ServiceDurationDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  addons?: ServiceAddonDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  subscriptions?: ServiceSubscriptionDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  peakHours?: ServicePeakHourDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  subServices?: ServiceSubServiceDto[];
}

export enum DurationPriceMode {
  PERCENT = 'percent',
  FIXED = 'fixed',
}

export class ServiceDurationDto {
  @IsNumber()
  durationHours!: number;

  @IsNumber()
  priceMultiplier!: number;

  @IsOptional()
  @IsEnum(DurationPriceMode)
  priceMode?: DurationPriceMode;

  @IsOptional()
  @IsNumber()
  fixedPrice?: number;

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  suggestedArea?: number;

  @IsOptional()
  @IsNumber()
  taskerCount?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class ServiceAddonDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  iconUrl?: string;

  @IsNumber()
  price!: number;

  @IsOptional()
  @IsString()
  priceUnit?: string;

  @IsOptional()
  @IsNumber()
  durationMinutes?: number;

  @IsOptional()
  @IsNumber()
  maxQuantity?: number;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ServiceSubscriptionDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  bonusDescription?: string;

  @IsNumber()
  discountPercent!: number;

  @IsOptional()
  @IsString()
  billingCycle?: string;

  @IsOptional()
  @IsNumber()
  sessionsPerCycle?: number;

  @IsOptional()
  @IsNumber()
  commitmentMonths?: number;

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ServicePeakHourDto {
  @IsInt()
  dayOfWeek!: number;

  @IsString()
  startHour!: string;

  @IsString()
  endHour!: string;

  @IsNumber()
  multiplier!: number;

  @IsOptional()
  @IsString()
  startDate?: string | null;

  @IsOptional()
  @IsString()
  endDate?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ServiceSubServiceDto {
  @IsString()
  subServiceId!: string;

  @IsNumber()
  price!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
