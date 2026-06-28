import {
  IsUUID,
  IsNumber,
  IsOptional,
  Min,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CalculatePriceDto {
  @ApiProperty({ description: 'ID gói dịch vụ' })
  @IsUUID()
  packageId!: string;

  @ApiProperty({ description: 'ID mức giá (pricing tier)' })
  @IsUUID()
  pricingTierId!: string;

  @ApiProperty({
    example: 80,
    description: 'Diện tích m² (bắt buộc nếu mode = AREA_HOURLY)',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(1)
  @Type(() => Number)
  areaM2?: number;

  @ApiProperty({ example: 3, description: 'Số giờ làm việc' })
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.5)
  @Type(() => Number)
  durationHours!: number;

  // ─── Phụ phí tuỳ chọn ──────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: false, description: 'Đặt giờ cao điểm?' })
  @IsOptional()
  @IsBoolean()
  isPeakHour?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Có thú cưng?' })
  @IsOptional()
  @IsBoolean()
  hasPet?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Có cần dụng cụ?' })
  @IsOptional()
  @IsBoolean()
  needTools?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Đặt ban đêm?' })
  @IsOptional()
  @IsBoolean()
  isNightShift?: boolean;

  @ApiPropertyOptional({
    example: ['uuid-sub-1', 'uuid-sub-2'],
    description: 'Danh sách subServiceId được chọn (để tính phụ phí nếu có)',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  selectedSubServiceIds?: string[];

  @ApiPropertyOptional({ description: 'ID voucher (nếu có)' })
  @IsOptional()
  @IsUUID()
  voucherId?: string;
}
