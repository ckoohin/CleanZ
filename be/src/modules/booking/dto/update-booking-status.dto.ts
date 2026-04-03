import { IsEnum, IsNotEmpty } from 'class-validator';
import { BookingStatus } from 'src/common/enums/booking-status.enum';

export class UpdateBookingStatusDto {
  @IsEnum(BookingStatus, {
    message: 'Trạng thái không hợp lệ (confirmed / in_progress / completed)',
  })
  @IsNotEmpty()
  status: BookingStatus;
}
