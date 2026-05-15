import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  IsDateString,
  Matches,
  IsNumber,
  Min,
  IsArray,
  IsNotEmpty,
} from 'class-validator';
import { ServiceLocationType } from '../../../common/enums/service-location-type.enum';

export class CreateBookingDto {
  @ApiProperty({
    description: 'ID của service',
    example: '4f4f0dc4-2ed0-4a6f-bd04-e802cc8b8d9b',
  })
  @IsUUID()
  @IsNotEmpty({ message: 'Vui lòng chọn loại dịch vụ' })
  serviceId!: string;

  @ApiProperty({
    description: 'Loại địa điểm dịch vụ',
    enum: ServiceLocationType,
    example: ServiceLocationType.HOME,
  })
  @IsEnum(ServiceLocationType)
  @IsNotEmpty({ message: 'Loại địa điểm không được để trống' })
  locationType!: ServiceLocationType;

  @ApiProperty({
    description: 'Địa chỉ cụ thể (bắt buộc cho cả HOME và AT_SHOP)',
    example: '123 Nguyen Hue, Quan 1, TP.HCM',
  })
  @IsNotEmpty({ message: 'Địa chỉ không được để trống' })
  @IsString({ message: 'Địa chỉ không thể để trống' })
  address!: string;

  @ApiProperty({
    description: 'Ngày đặt lịch (YYYY-MM-DD)',
    example: '2026-05-20',
  })
  @IsDateString()
  @IsNotEmpty({ message: 'Ngày đặt lịch không được để trống' })
  bookingDate!: string;

  @ApiProperty({
    description: 'Giờ đặt lịch (HH:mm)',
    example: '09:00',
  })
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Giờ đặt lịch phải đúng định dạng HH:mm (24h)',
  })
  @IsNotEmpty({ message: 'Giờ đặt lịch không được để trống' })
  bookingTime!: string;

  @ApiPropertyOptional({
    description: 'Số giờ ước tính (tối thiểu 0.5 giờ)',
    example: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  estimatedHours?: number;

  @ApiPropertyOptional({
    description: 'Danh sách ID dịch thêm (addon) mà khách hàng chọn (nếu có)',
    example: ['addon-electronics', 'addon-glass'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addonServiceIds?: string[];

  @ApiPropertyOptional({
    description: 'Yêu cầu đặc biệt (dị ứng, vật dụng cần cẩn thận)',
    example: 'Cần dọn kỹ phòng khách, tránh dùng hóa chất mạnh',
  })
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiPropertyOptional({
    description: 'Ghi chú thêm',
    example: 'Gọi trước 15 phút',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
