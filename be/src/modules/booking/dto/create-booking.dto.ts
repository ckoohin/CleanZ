import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';

export class CreateBookingDto {
  @ApiPropertyOptional({
    example: '6224bfaf-ed46-4770-88c0-ff1a645cc279',
    description:
      'ID gói dịch vụ customer muốn đặt. Khi truyền serviceId, hệ thống tự lấy thời lượng từ services.base_duration_hours.',
  })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({
    example: '6d625675-7d12-458f-af83-2db2e8eb7db8',
    description:
      'ID địa chỉ đã lưu của customer. Nếu bỏ trống, hệ thống dùng địa chỉ mặc định của customer.',
  })
  @IsOptional()
  @IsUUID()
  addressId?: string;

  @ApiPropertyOptional({
    example: '12 Nguyen Hue, Ben Nghe, Quan 1, TP.HCM',
    description:
      'Không còn khuyến nghị dùng. Booking sẽ ưu tiên addressId hoặc địa chỉ mặc định để có tọa độ tính khoảng cách.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  address?: string;

  @ApiPropertyOptional({
    example: 'HN',
    description:
      'Mã tỉnh/thành dùng để kiểm tra khu vực hỗ trợ. Hiện hệ thống chỉ phục vụ Hà Nội và có thể tự kiểm tra từ địa chỉ đã lưu.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  provinceCode?: string;

  @ApiPropertyOptional({
    example: '2026-06-17T07:00:00.000Z',
    description:
      'Thời gian bắt đầu dịch vụ dạng ISO. Có thể bỏ nếu đã gửi scheduledDate và scheduledTime.',
  })
  @ValidateIf(
    (dto: CreateBookingDto) => !dto.scheduledDate || !dto.scheduledTime,
  )
  @IsDateString()
  scheduledStart?: string;

  @ApiPropertyOptional({
    example: '2026-06-17',
    description: 'Ngày làm dịch vụ, format YYYY-MM-DD',
  })
  @ValidateIf((dto: CreateBookingDto) => !dto.scheduledStart)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'scheduledDate phải có định dạng YYYY-MM-DD',
  })
  scheduledDate?: string;

  @ApiPropertyOptional({
    example: '14:00',
    description: 'Giờ bắt đầu làm dịch vụ, format HH:mm theo giờ Việt Nam',
  })
  @ValidateIf((dto: CreateBookingDto) => !dto.scheduledStart)
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'scheduledTime phải có định dạng HH:mm',
  })
  scheduledTime?: string;

  @ApiPropertyOptional({
    example: 3,
    description:
      'Chỉ dùng khi không truyền serviceId để hệ thống tự tìm gói theo số giờ. FE nên ưu tiên truyền serviceId và bỏ field này.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  durationHours?: number;

  @ApiPropertyOptional({
    example: 'Nhà có mèo, vui lòng gọi trước khi tới.',
    description: 'Ghi chú cho tasker',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    example: PaymentMethod.CASH,
    description:
      'Phương thức thanh toán. Nếu bỏ trống, hệ thống mặc định là CASH.',
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    example: 'WELCOME50',
    description: 'Mã voucher nếu customer muốn áp dụng',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  voucherCode?: string;
}
