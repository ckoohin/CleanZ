import {
  IsBoolean,
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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';

export class CreateBookingDto {
  @ApiPropertyOptional({
    example: 'c03b2f95-2dd7-4979-a49a-23a3562df2db',
    description:
      'ID dịch vụ customer muốn đặt. Nếu bỏ trống, hệ thống dùng dịch vụ mặc định Dọn dẹp.',
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

  @ApiProperty({
    example: 'HCM',
    description:
      'Mã tỉnh/thành. Hiện giá dọn dẹp áp dụng như nhau ở mọi nơi nên field này không bắt buộc.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  provinceCode?: string;

  @ApiPropertyOptional({
    example: '2026-06-15T09:00:00.000Z',
    description:
      'Thời gian bắt đầu dịch vụ dạng ISO. Có thể bỏ nếu đã gửi scheduledDate và scheduledTime.',
  })
  @ValidateIf(
    (dto: CreateBookingDto) => !dto.scheduledDate || !dto.scheduledTime,
  )
  @IsDateString()
  scheduledStart?: string;

  @ApiPropertyOptional({
    example: '2026-06-15',
    description: 'Ngày làm dịch vụ, format YYYY-MM-DD',
  })
  @ValidateIf((dto: CreateBookingDto) => !dto.scheduledStart)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'scheduledDate phải có định dạng YYYY-MM-DD',
  })
  scheduledDate?: string;

  @ApiPropertyOptional({
    example: '19:00',
    description: 'Giờ bắt đầu làm dịch vụ, format HH:mm theo giờ Việt Nam',
  })
  @ValidateIf((dto: CreateBookingDto) => !dto.scheduledStart)
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'scheduledTime phải có định dạng HH:mm',
  })
  scheduledTime?: string;

  @ApiProperty({
    example: 3,
    description: 'Số giờ làm dịch vụ',
  })
  @IsNumber()
  @Min(0.5)
  durationHours!: number;

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

  @ApiPropertyOptional({
    example: false,
    description: 'Đặt lịch lặp lại hay không',
  })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    example: 'FREQ=WEEKLY;COUNT=4',
    description: 'Rule lặp lại nếu isRecurring = true',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  recurringRule?: string;
}
