import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  IsBoolean,
  IsArray,
  IsEnum,
} from 'class-validator';
import { ServiceLocationType } from 'src/common/enums/service-location-type.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class CreateServiceDto {
  @ApiProperty({
    example: 'Vệ sinh máy lạnh',
    description: 'Tên dịch vụ',
  })
  @IsString({ message: 'Tên dịch vụ phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên dịch vụ không được để trống' })
  name: string;

  @ApiProperty({
    example: 'Điện lạnh',
    description: 'Danh mục dịch vụ',
  })
  @IsString({ message: 'Danh mục phải là chuỗi' })
  @IsNotEmpty({ message: 'Danh mục không được để trống' })
  category: string;

  @IsArray({ message: 'Loại địa điểm phải là mảng' })
  @IsEnum(ServiceLocationType, {
    each: true,
    message: 'Loại địa điểm không hợp lệ (home / at_shop)',
  })
  @IsNotEmpty({ message: 'Loại địa điểm không được để trống' })
  supportedLocationTypes: ServiceLocationType[];

  @ApiPropertyOptional({
    example: 'Vệ sinh tổng thể máy lạnh tại nhà',
    description: 'Mô tả dịch vụ',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 250000,
    minimum: 0,
    description: 'Giá cơ bản (VND)',
  })
  @IsNumber({}, { message: 'Giá cơ bản phải là số' })
  @Min(0, { message: 'Giá không được âm' })
  basePrice: number;

  @ApiPropertyOptional({
    example: 60,
    minimum: 1,
    description: 'Thời lượng ước tính (phút)',
  })
  @IsNumber()
  @Min(1, { message: 'Thời gian tối thiểu là 1 phút' })
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/demo/image/upload/service.png',
    description: 'URL ảnh dịch vụ',
  })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Trạng thái kích hoạt dịch vụ',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
