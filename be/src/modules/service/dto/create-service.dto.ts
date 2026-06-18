import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateServiceDto {
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
  baseDurationHours?: number;

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
}
