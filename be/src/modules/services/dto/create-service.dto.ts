import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, IsBoolean } from 'class-validator';

export class CreateServiceDto {
  @IsString({ message: 'Tên dịch vụ phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên dịch vụ không được để trống' })
  name: string;

  @IsString({ message: 'Danh mục phải là chuỗi' })
  @IsNotEmpty({ message: 'Danh mục không được để trống' })
  category: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber({}, { message: 'Giá cơ bản phải là số' })
  @Min(0, { message: 'Giá không được âm' })
  basePrice: number;

  @IsNumber()
  @Min(1, { message: 'Thời gian tối thiểu là 1 phút' })
  @IsOptional()
  duration?: number;

  @IsString()
  @IsOptional()
  image?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}