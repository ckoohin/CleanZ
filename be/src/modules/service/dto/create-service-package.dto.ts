import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  IsArray,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({ example: ['uuid-area-1', 'uuid-area-2'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coverageAreaIds?: string[];
}
