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

  @ApiPropertyOptional({ example: 'HOURLY', description: 'Chế độ tính giá của gói' })
  pricingMode!: string | null;

  @ApiProperty({ type: [PublicCoverageAreaDto] })
  coverageAreas!: PublicCoverageAreaDto[];

  @ApiProperty({ type: [PublicSubServiceResponseDto] })
  subServices!: PublicSubServiceResponseDto[];
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
