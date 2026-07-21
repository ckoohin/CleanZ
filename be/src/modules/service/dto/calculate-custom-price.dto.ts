import {
  IsUUID,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsString,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CalculateCustomPriceDto {
  @ApiProperty({
    description: 'UUID của gói dịch vụ cần tính giá',
    example: '10251e38-6d94-47bf-b91d-6805369dd680',
  })
  @IsUUID()
  packageId!: string;

  @ApiProperty({
    description: 'Số giờ thực hiện dịch vụ (min 0.5, max 24)',
    example: 3.5,
    minimum: 0.5,
    maximum: 24,
  })
  @IsNumber()
  @Min(0.5)
  @Max(24)
  @Type(() => Number)
  hours!: number;

  @ApiPropertyOptional({
    description:
      'true = Thợ VIP 5 sao (premiumHourlyRate), false = Thợ Thường (baseHourlyRate)',
    default: false,
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  isPremium?: boolean = false;

  @ApiPropertyOptional({
    description: 'Nhà có thú cưng (chó/mèo) → cộng thêm petSurcharge',
    default: false,
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  hasPets?: boolean = false;

  @ApiPropertyOptional({
    description: 'Thợ tự mang dụng cụ & nước tẩy → cộng thêm toolFee',
    default: false,
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  bringTools?: boolean = false;

  @ApiPropertyOptional({
    description: 'Số lượng thợ (default 1). Giá nhân theo số thợ.',
    default: 1,
    minimum: 1,
    maximum: 10,
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  taskerQuantity?: number = 1;

  @ApiPropertyOptional({
    description: 'Diện tích m² (dùng khi gói có pricingMode = AREA_HOURLY)',
    example: 80,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  areaM2?: number;

  @ApiPropertyOptional({
    description: 'Danh sách UUID các dịch vụ phụ mua thêm',
    type: [String],
    example: [],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  subServiceIds?: string[] = [];

  @ApiPropertyOptional({
    description: 'Mã Voucher giảm giá (VD: CLEAN20K)',
    example: 'CLEAN20K',
  })
  @IsString()
  @IsOptional()
  voucherCode?: string;
}
