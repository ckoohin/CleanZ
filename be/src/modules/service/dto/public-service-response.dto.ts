import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublicServicePricingDto {
  @ApiProperty({ example: 120000 })
  basePrice!: number;

  @ApiProperty({ example: 30000 })
  petFee!: number;

  @ApiProperty({ example: 20000 })
  waitingFee!: number;
}

export class PublicServiceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'SRV-HOME02' })
  serviceCode!: string;

  @ApiProperty({ example: 'Gói tiêu chuẩn 2 giờ' })
  name!: string;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiPropertyOptional()
  shortDescription!: string | null;

  @ApiProperty({ example: 2 })
  baseDurationHours!: number;

  @ApiPropertyOptional()
  thumbnailUrl!: string | null;

  @ApiProperty({ type: [String] })
  galleryUrls!: string[];

  @ApiProperty({ type: [String] })
  includedTasks!: string[];

  @ApiProperty({ type: [String] })
  excludedTasks!: string[];

  @ApiProperty({ type: PublicServicePricingDto })
  pricing!: PublicServicePricingDto;
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

export class PublicServiceListResponseDto {
  @ApiProperty({ type: [PublicServiceResponseDto] })
  data!: PublicServiceResponseDto[];

  @ApiProperty({ type: PublicServiceListMetaDto })
  meta!: PublicServiceListMetaDto;
}
