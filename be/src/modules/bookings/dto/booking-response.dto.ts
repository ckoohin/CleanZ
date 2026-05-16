import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '../../../common/enums/booking-status.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { BookingType } from '../../../common/enums/booking-type.enum';
import { ServiceLocationType } from '../../../common/enums/service-location-type.enum';

export class BookingAddonResponseDto {
  @ApiProperty({ description: 'Tên dịch vụ bổ sung' })
  addonName!: string;

  @ApiProperty({ description: 'Giá dịch vụ bổ sung' })
  addonPrice!: number;
}

export class BookingResponseDto {
  @ApiProperty({ description: 'ID booking' })
  id!: string;

  @ApiProperty({ description: 'Mã đơn hàng duy nhất' })
  orderCode!: string;

  @ApiProperty({ description: 'ID khách hàng' })
  customerId!: string;

  @ApiProperty({ description: 'Tên khách hàng' })
  customerName!: string;

  @ApiPropertyOptional({ description: 'Số điện thoại khách hàng' })
  customerPhone?: string;

  @ApiPropertyOptional({ description: 'Email khách hàng' })
  customerEmail?: string;

  @ApiProperty({ description: 'ID dịch vụ' })
  serviceId!: string;

  @ApiProperty({ description: 'Tên dịch vụ' })
  serviceName!: string;

  @ApiPropertyOptional({
    description: 'ID staff service (null nếu chưa assign)',
  })
  staffServiceId?: string;

  @ApiPropertyOptional({ description: 'Tên staff (null nếu chưa assign)' })
  staffName?: string;

  @ApiProperty({ description: 'Loại booking', enum: BookingType })
  bookingType!: BookingType;

  @ApiProperty({ description: 'Loại địa điểm', enum: ServiceLocationType })
  locationType!: ServiceLocationType;

  @ApiProperty({ description: 'Địa chỉ cụ thể' })
  address!: string;

  @ApiProperty({ description: 'Ngày đặt lịch (YYYY-MM-DD)' })
  bookingDate!: string;

  @ApiProperty({ description: 'Giờ đặt lịch (HH:mm)' })
  bookingTime!: string;

  @ApiPropertyOptional({ description: 'Số giờ ước tính' })
  estimatedHours?: number;

  @ApiPropertyOptional({ description: 'Số giờ thực tế' })
  actualHours?: number;

  @ApiPropertyOptional({ description: 'Giá theo giờ' })
  hourlyRate?: number;

  @ApiProperty({ description: 'Giá dự kiến ban đầu' })
  quotedPrice!: number;

  @ApiProperty({ description: 'Tổng giá' })
  totalPrice!: number;

  @ApiPropertyOptional({
    description: 'Danh sách dịch vụ bổ sung',
    type: [BookingAddonResponseDto],
  })
  addons?: BookingAddonResponseDto[];

  @ApiPropertyOptional({ description: 'Yêu cầu đặc biệt' })
  specialRequests?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  notes?: string;

  @ApiProperty({ description: 'Trạng thái booking', enum: BookingStatus })
  status!: BookingStatus;

  @ApiProperty({ description: 'Trạng thái thanh toán', enum: PaymentStatus })
  paymentStatus!: PaymentStatus;

  @ApiPropertyOptional({ description: 'Thời điểm xác nhận' })
  confirmedAt?: Date;

  @ApiPropertyOptional({ description: 'ID người hủy booking' })
  cancelledBy?: string;

  @ApiPropertyOptional({ description: 'Lý do hủy booking' })
  cancellationReason?: string;

  @ApiPropertyOptional({ description: 'Thời điểm hủy' })
  cancelledAt?: Date;

  @ApiProperty({ description: 'Thời điểm tạo' })
  createdAt!: Date;

  @ApiProperty({ description: 'Thời điểm cập nhật' })
  updatedAt!: Date;
}
