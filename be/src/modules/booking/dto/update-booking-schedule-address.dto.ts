import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateBookingScheduleAddressDto {
  @ApiPropertyOptional({
    example: '6d625675-7d12-458f-af83-2db2e8eb7db8',
    description:
      'ID địa chỉ đã lưu mới của customer. Nếu bỏ trống khi cập nhật, booking giữ địa chỉ hiện tại.',
  })
  @IsOptional()
  @IsUUID()
  addressId?: string;

  @ApiPropertyOptional({
    example: 'Số 1 Trần Duy Hưng, Cầu Giấy, Hà Nội',
    description:
      'Không còn khuyến nghị dùng. Booking nên dùng địa chỉ đã lưu để có tọa độ tính khoảng cách.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  address?: string;

  @ApiPropertyOptional({
    example: 'HN',
    description: 'Mã tỉnh/thành. Hiện hệ thống chỉ hỗ trợ Hà Nội.',
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
    (dto: UpdateBookingScheduleAddressDto) =>
      !dto.scheduledDate && !dto.scheduledTime,
  )
  @IsOptional()
  @IsDateString()
  scheduledStart?: string;

  @ApiPropertyOptional({
    example: '2026-06-15',
    description: 'Ngày làm dịch vụ mới, format YYYY-MM-DD',
  })
  @ValidateIf((dto: UpdateBookingScheduleAddressDto) => !dto.scheduledStart)
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'scheduledDate phải có định dạng YYYY-MM-DD',
  })
  scheduledDate?: string;

  @ApiPropertyOptional({
    example: '19:00',
    description: 'Giờ bắt đầu làm dịch vụ mới, format HH:mm theo giờ Việt Nam',
  })
  @ValidateIf((dto: UpdateBookingScheduleAddressDto) => !dto.scheduledStart)
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'scheduledTime phải có định dạng HH:mm',
  })
  scheduledTime?: string;
}
