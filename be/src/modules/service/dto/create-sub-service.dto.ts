import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  MaxLength,
  IsNotEmpty,
  IsArray,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateSubServiceDto {
  @ApiProperty({ example: 'Dọn dẹp nhà 2 giờ' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'Dịch vụ dọn dẹp nhà cơ bản trong 2 giờ.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 2.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.5)
  @Type(() => Number)
  durationHours?: number;

  @ApiPropertyOptional({
    example:
      'MULTIPOLYGON(((105.7000 20.9500,105.9500 20.9500,105.9500 21.1500,105.7000 21.1500,105.7000 20.9500)))',
  })
  @IsOptional()
  @IsString()
  coverageArea?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/main-image.jpg' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: ['https://img1.jpg', 'https://img2.jpg'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  galleryUrls?: string[];

  @ApiPropertyOptional({
    example: 'Dọn dẹp căn hộ tiêu chuẩn, bao gồm phòng khách, phòng ngủ.',
  })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional({ example: ['Quét nhà', 'Lau sàn', 'Đổ rác'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includedTasks?: string[];

  @ApiPropertyOptional({ example: ['Giặt là', 'Nấu ăn'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedTasks?: string[];

  @ApiPropertyOptional({ example: 'Điều khoản riêng...' })
  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @ApiPropertyOptional({ example: 'FIXED' })
  @IsOptional()
  @IsString()
  pricingType?: string; // 'FIXED', 'UNIT'

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  pricingConfigId?: string;
}
