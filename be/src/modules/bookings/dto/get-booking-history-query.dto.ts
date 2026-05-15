import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { BookingStatus } from '../../../common/enums/booking-status.enum';

export class GetBookingHistoryQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái booking',
    enum: BookingStatus,
    example: BookingStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({
    description: 'Lọc từ ngày booking (YYYY-MM-DD)',
    example: '2026-05-01',
  })
  @IsOptional()
  @IsDateString()
  bookingDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Lọc đến ngày booking (YYYY-MM-DD)',
    example: '2026-05-31',
  })
  @IsOptional()
  @IsDateString()
  bookingDateTo?: string;
}
