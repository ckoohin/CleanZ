import {
  IsArray,
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

export class CreateBookingForCustomerDto {
  @ApiProperty({
    example: '0912345678',
    description: 'Số điện thoại của customer. Dùng để tra cứu tài khoản.',
  })
  @IsString()
  @IsNotEmpty()
  customerPhone!: string;

  @ApiPropertyOptional({
    example: 'Chị Lan',
    description:
      'Tên khách vãng lai. Chỉ dùng khi SĐT chưa có tài khoản — tasker tạo đơn offline (guest). Có tên thì tạo đơn guest thay vì báo lỗi không tìm thấy khách.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerName?: string;

  @ApiProperty({
    example: '6224bfaf-ed46-4770-88c0-ff1a645cc279',
    description: 'ID gói dịch vụ (ServicePackage).',
  })
  @IsUUID()
  packageId!: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['6224bfaf-ed46-4770-88c0-ff1a645cc279'],
    description: 'Danh sách ID addon.',
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  addonIds?: string[];

  @ApiPropertyOptional({
    example: '6d625675-7d12-458f-af83-2db2e8eb7db8',
    description: 'ID địa chỉ đã lưu của customer.',
  })
  @IsOptional()
  @IsUUID()
  addressId?: string;

  @ApiPropertyOptional({
    example: '12 Nguyen Hue, Ben Nghe, Quan 1, TP.HCM',
    description: 'Địa chỉ nhập tay nếu customer không có địa chỉ lưu sẵn.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  address?: string;

  @ApiPropertyOptional({
    example: 21.028511,
    description:
      'Vĩ độ của địa chỉ nhập/search mới. Nếu có cùng longitude, hệ thống sẽ lưu địa chỉ này vào sổ địa chỉ customer để booking có tọa độ.',
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    example: 105.804817,
    description:
      'Kinh độ của địa chỉ nhập/search mới. Nếu có cùng latitude, hệ thống sẽ lưu địa chỉ này vào sổ địa chỉ customer để booking có tọa độ.',
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({
    example: '2026-06-17T07:00:00.000Z',
    description: 'Thời gian bắt đầu dạng ISO. Bỏ trống để đặt ngay bây giờ.',
  })
  @ValidateIf(
    (dto: CreateBookingForCustomerDto) =>
      !dto.scheduledDate || !dto.scheduledTime,
  )
  @IsOptional()
  @IsDateString()
  scheduledStart?: string;

  @ApiPropertyOptional({
    example: '2026-06-17',
    description: 'Ngày làm dịch vụ, format YYYY-MM-DD.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'scheduledDate phải có định dạng YYYY-MM-DD',
  })
  scheduledDate?: string;

  @ApiPropertyOptional({
    example: '14:00',
    description: 'Giờ bắt đầu làm dịch vụ, format HH:mm (giờ Việt Nam).',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'scheduledTime phải có định dạng HH:mm',
  })
  scheduledTime?: string;

  @ApiPropertyOptional({
    example: 3,
    description: 'Số giờ dịch vụ.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  durationHours?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Nhà có thú cưng hay không.',
  })
  @IsOptional()
  @IsBoolean()
  hasPet?: boolean;

  @ApiPropertyOptional({
    example: 55.5,
    description: 'Diện tích căn hộ (m²).',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  areaM2?: number;

  @ApiPropertyOptional({
    example: '6224bfaf-ed46-4770-88c0-ff1a645cc279',
    description: 'ID mức giá (pricing tier).',
  })
  @IsOptional()
  @IsUUID()
  pricingTierId?: string;

  @ApiPropertyOptional({
    example: 'Nhà có mèo, vui lòng gọi trước khi tới.',
    description: 'Ghi chú.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    example: PaymentMethod.CASH,
    description: 'Phương thức thanh toán. Mặc định là CASH.',
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    example: 'WELCOME50',
    description: 'Mã voucher tasker áp cho khách (nếu có).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  voucherCode?: string;
}
