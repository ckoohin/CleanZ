import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { BookingServiceTier } from 'src/common/enums/booking-service-tier.enum';
import { BookingCheckinReviewStatus } from 'src/common/enums/booking-checkin-review-status.enum';
import { BookingNoShowReviewStatus } from 'src/common/enums/booking-no-show-review-status.enum';

export class BookingSearchQueryDto {
  @ApiPropertyOptional({
    description:
      'Tìm theo mã booking, tên/email/số điện thoại khách hàng hoặc Tasker',
    example: 'BKMQ',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Customer ID trong bảng customers',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Tasker ID trong bảng taskers',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  taskerId?: string;

  @ApiPropertyOptional({
    description: 'Service ID trong bảng services',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({
    description: 'Lọc booking được tạo từ thời điểm này',
    example: '2026-06-01T00:00:00+07:00',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Lọc booking được tạo đến thời điểm này',
    example: '2026-06-30T23:59:59+07:00',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({
    description:
      'Chỉ lấy booking checkout sớm bất thường (kết thúc sớm hơn thời lượng đặt > 30 phút)',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  abnormalEarlyCheckout?: boolean;

  @ApiPropertyOptional({
    description:
      'Chỉ lấy booking khách không thanh toán phần phát sinh (nền tảng đã ứng trả tasker)',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  surchargeDisputed?: boolean;

  @ApiPropertyOptional({
    description: 'Lọc theo hạng dịch vụ (STANDARD / PREMIUM)',
    enum: BookingServiceTier,
    example: BookingServiceTier.PREMIUM,
  })
  @IsOptional()
  @IsEnum(BookingServiceTier)
  serviceTier?: BookingServiceTier;

  @ApiPropertyOptional({
    description:
      'Chỉ lấy booking tasker check-in ngoài bán kính cho phép / không có GPS (kèm ảnh minh chứng)',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  farCheckin?: boolean;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái Admin review bằng chứng check-in',
    enum: BookingCheckinReviewStatus,
    example: BookingCheckinReviewStatus.PENDING_REVIEW,
  })
  @IsOptional()
  @IsEnum(BookingCheckinReviewStatus)
  checkinReviewStatus?: BookingCheckinReviewStatus;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái Admin review booking no-show',
    enum: BookingNoShowReviewStatus,
    example: BookingNoShowReviewStatus.PENDING_REVIEW,
  })
  @IsOptional()
  @IsEnum(BookingNoShowReviewStatus)
  noShowReviewStatus?: BookingNoShowReviewStatus;

  @ApiPropertyOptional({
    description:
      'Chỉ lấy booking IN_PROGRESS đã quá giờ kết thúc dự kiến ít nhất 30 phút',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  overdueCompletion?: boolean;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;
}
