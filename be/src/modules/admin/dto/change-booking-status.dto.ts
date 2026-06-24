import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { BookingStatus } from 'src/common/enums/booking-status.enum';

export class ChangeBookingStatusDto {
  @ApiProperty({
    enum: BookingStatus,
    description: 'Trạng thái đích của booking',
  })
  @IsEnum(BookingStatus)
  status!: BookingStatus;

  @ApiProperty({
    example: 'Admin xử lý sự cố theo yêu cầu của khách hàng',
    maxLength: 500,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  reason!: string;
}
