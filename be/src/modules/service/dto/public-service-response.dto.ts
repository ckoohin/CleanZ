import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublicServicePricingDto {
  @ApiProperty({ example: 120000 })
  basePrice!: number;

  @ApiProperty({ example: 30000 })
  petFee!: number;

  @ApiProperty({ example: 20000 })
  waitingFee!: number;
}

export class PublicSubServiceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'SRV-HOME02' })
  subServiceCode!: string;

  @ApiProperty({ example: 'Dọn dẹp phòng khách' })
  name!: string;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiPropertyOptional()
  shortDescription!: string | null;

  @ApiProperty({ example: 2 })
  durationHours!: number;

  @ApiPropertyOptional()
  thumbnailUrl!: string | null;

  @ApiProperty({ type: [String] })
  galleryUrls!: string[];

  @ApiProperty({ type: [String] })
  includedTasks!: string[];

  @ApiProperty({ type: [String] })
  excludedTasks!: string[];

  @ApiProperty({ type: String, example: 'FIXED' })
  pricingType!: string;

  @ApiProperty({ type: PublicServicePricingDto })
  pricing!: PublicServicePricingDto;
}

export class PublicCoverageAreaDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Quan 1' })
  name!: string;
}

export class PublicPricingTierResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Gói tiêu chuẩn 2 giờ' })
  name!: string;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiProperty({ example: 'HOURLY' })
  pricingMode!: string;

  @ApiPropertyOptional({ example: 1 })
  minHours!: number | null;

  @ApiPropertyOptional({ example: 4 })
  maxHours!: number | null;

  @ApiPropertyOptional({ example: 2 })
  defaultHours!: number | null;

  @ApiPropertyOptional({ example: 120000 })
  pricePerHour!: number | null;

  @ApiPropertyOptional({ example: 2500 })
  pricePerM2!: number | null;

  @ApiPropertyOptional({ example: 250000 })
  fixedPrice!: number | null;

  @ApiPropertyOptional({ example: 30 })
  areaMinM2!: number | null;

  @ApiPropertyOptional({ example: 80 })
  areaMaxM2!: number | null;

  @ApiProperty({ example: 0 })
  sortOrder!: number;
}

export class PublicDurationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 2 })
  durationHours!: number;

  @ApiPropertyOptional({ example: 'Gói 2 giờ' })
  title!: string | null;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiProperty({ example: 1 })
  priceMultiplier!: number;

  @ApiProperty({ example: true })
  isPopular!: boolean;

  @ApiPropertyOptional({ example: 60 })
  suggestedArea!: number | null;

  @ApiProperty({ example: 1 })
  taskerCount!: number;
}

export class PublicAddonResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Vệ sinh tủ lạnh' })
  name!: string;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiProperty({ example: 50000 })
  price!: number;
}

export class PublicPeakHourResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 1, description: '0=CN, 1=T2, ... 6=T7' })
  dayOfWeek!: number;

  @ApiProperty({ example: '18:00' })
  startHour!: string;

  @ApiProperty({ example: '21:00' })
  endHour!: string;

  @ApiProperty({ example: 1.2 })
  multiplier!: number;

  @ApiPropertyOptional()
  startDate!: string | null;

  @ApiPropertyOptional()
  endDate!: string | null;
}

export class PublicPackageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'PKG-CLEAN' })
  packageCode!: string;

  @ApiProperty({ example: 'Dọn dẹp nhà cửa' })
  name!: string;

  @ApiPropertyOptional()
  iconUrl!: string | null;

  @ApiProperty({ example: 8.0 })
  maxHours!: number;

  @ApiPropertyOptional()
  termsAndConditions!: string | null;

  @ApiPropertyOptional()
  policyDescription!: string | null;

  @ApiProperty({ example: 50000 })
  nightSurcharge!: number;

  @ApiProperty({ example: 30000 })
  petSurcharge!: number;

  @ApiProperty({ example: 20000 })
  waitingSurcharge!: number;

  @ApiProperty({ example: 40000 })
  toolFee!: number;

  @ApiProperty({ example: 10 })
  peakRatePercent!: number;

  @ApiProperty({ example: 60000 })
  baseHourlyRate!: number;

  @ApiProperty({ example: 120000 })
  premiumHourlyRate!: number;

  @ApiPropertyOptional({
    example: 'HOURLY',
    description: 'Chế độ tính giá của gói',
  })
  pricingMode!: string | null;

  @ApiProperty({ type: [PublicCoverageAreaDto] })
  coverageAreas!: PublicCoverageAreaDto[];

  @ApiProperty({ type: [PublicSubServiceResponseDto] })
  subServices!: PublicSubServiceResponseDto[];

  @ApiProperty({ type: [PublicPricingTierResponseDto] })
  pricingTiers!: PublicPricingTierResponseDto[];

  @ApiProperty({ type: [PublicDurationResponseDto] })
  durations!: PublicDurationResponseDto[];

  @ApiProperty({ type: [PublicAddonResponseDto] })
  addons!: PublicAddonResponseDto[];

  @ApiProperty({ type: [PublicPeakHourResponseDto] })
  peakHours!: PublicPeakHourResponseDto[];
}

export class PublicServiceListMetaDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PublicPackageListResponseDto {
  @ApiProperty({ type: [PublicPackageResponseDto] })
  data!: PublicPackageResponseDto[];

  @ApiProperty({ type: PublicServiceListMetaDto })
  meta!: PublicServiceListMetaDto;
}

// Giữ lại alias để tương thích ngược nếu cần
export class PublicServiceResponseDto extends PublicSubServiceResponseDto {}
export class PublicServiceListResponseDto {
  @ApiProperty({ type: [PublicSubServiceResponseDto] })
  data!: PublicSubServiceResponseDto[];

  @ApiProperty({ type: PublicServiceListMetaDto })
  meta!: PublicServiceListMetaDto;
}
