import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpsertCustomerAddressDto {
  @ApiPropertyOptional({
    example: 'Nhà riêng',
    maxLength: 100,
    description: 'Tên gợi nhớ địa chỉ',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string | null;

  @ApiProperty({
    example:
      'Tòa nhà FPT Polytechnic, Phố Trịnh Văn Bô, Xuân Phương, Nam Từ Liêm, Hà Nội',
    description: 'Địa chỉ đầy đủ',
  })
  @IsString()
  @IsNotEmpty()
  fullAddress!: string;

  @ApiPropertyOptional({
    example: 'Xuân Phương, Nam Từ Liêm, Hà Nội',
    maxLength: 255,
    description: 'Thông tin phường/quận/tỉnh',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  wardDetail?: string | null;

  @ApiPropertyOptional({
    example: 21.0381,
    description: 'Vĩ độ địa chỉ',
  })
  @IsOptional()
  @IsLatitude()
  latitude?: number | null;

  @ApiPropertyOptional({
    example: 105.7467,
    description: 'Kinh độ địa chỉ',
  })
  @IsOptional()
  @IsLongitude()
  longitude?: number | null;

  @ApiPropertyOptional({
    example: true,
    description: 'Đặt làm địa chỉ mặc định',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Địa chỉ có thú cưng hay không',
  })
  @IsOptional()
  @IsBoolean()
  hasPet?: boolean;

  @ApiPropertyOptional({
    example: 'Nguyễn Văn A',
    description: 'Tên người liên hệ tại địa chỉ này',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactName?: string | null;

  @ApiPropertyOptional({
    example: '0987654321',
    description: 'Số điện thoại người liên hệ',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string | null;

  @ApiPropertyOptional({
    example: 'Tòa A, Tầng 5, Phòng 501',
    description: 'Tòa nhà, số tầng, số phòng',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  buildingFloor?: string | null;

  @ApiPropertyOptional({
    example: 'Cổng số 2',
    description: 'Cổng vào khu nhà',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  gate?: string | null;

  @ApiPropertyOptional({
    example: 'Đến nơi gọi điện trước 5 phút',
    description: 'Ghi chú thêm cho tài xế/tasker',
  })
  @IsOptional()
  @IsString()
  driverNote?: string | null;
}
