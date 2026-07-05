import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  IsArray,
  IsEnum,
  IsUUID,
  Min,
  Max,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PricingMode } from '../../pricing/entity/pricing-tier.entity';

const TIME_HH_MM_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

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
  @ValidateNested({ each: true })
  @Type(() => ServiceDurationDto)
  durations?: ServiceDurationDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceAddonDto)
  addons?: ServiceAddonDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceSubscriptionDto)
  subscriptions?: ServiceSubscriptionDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServicePeakHourDto)
  peakHours?: ServicePeakHourDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceSubServiceDto)
  subServices?: ServiceSubServiceDto[];
}

export enum DurationPriceMode {
  PERCENT = 'percent',
  FIXED = 'fixed',
}

export class ServiceDurationDto {
  @IsNumber()
  @Min(0.5, { message: 'durationHours phải lớn hơn 0' })
  durationHours!: number;

  @IsNumber()
  @Min(0, { message: 'priceMultiplier không được âm' })
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
  @Min(0, { message: 'suggestedArea không được âm' })
  suggestedArea?: number;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'taskerCount phải >= 1' })
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
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  iconUrl?: string;

  @IsNumber()
  @Min(0, { message: 'price không được âm' })
  price!: number;

  @IsOptional()
  @IsString()
  priceUnit?: string;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'durationMinutes không được âm' })
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'maxQuantity phải >= 1' })
  maxQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ServiceSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  bonusDescription?: string;

  @IsNumber()
  @Min(0, { message: 'discountPercent phải từ 0 đến 100' })
  @Max(100, { message: 'discountPercent phải từ 0 đến 100' })
  discountPercent!: number;

  @IsOptional()
  @IsString()
  billingCycle?: string;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'sessionsPerCycle phải >= 1' })
  sessionsPerCycle?: number;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'commitmentMonths không được âm' })
  commitmentMonths?: number;

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ServicePeakHourDto {
  @IsInt()
  @Min(0, { message: 'dayOfWeek phải từ 0 (CN) đến 6 (T7), hoặc 7 = mọi ngày' })
  @Max(7, { message: 'dayOfWeek phải từ 0 (CN) đến 6 (T7), hoặc 7 = mọi ngày' })
  dayOfWeek!: number;

  @IsString()
  @Matches(TIME_HH_MM_REGEX, {
    message: 'startHour phải theo định dạng HH:mm (00:00–23:59)',
  })
  startHour!: string;

  @IsString()
  @Matches(TIME_HH_MM_REGEX, {
    message: 'endHour phải theo định dạng HH:mm (00:00–23:59)',
  })
  endHour!: string;

  @IsNumber()
  @Min(1, {
    message: 'multiplier phải >= 1 (1.5 = phụ thu 50% trong khung cao điểm)',
  })
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
  @IsUUID('4', { message: 'subServiceId phải là UUID hợp lệ' })
  subServiceId!: string;

  @IsNumber()
  @Min(0, { message: 'price không được âm' })
  price!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
