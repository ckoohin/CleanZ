import {
  IsUUID,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  IsMilitaryTime,
  ValidateIf,
} from 'class-validator';
import { BookingType } from 'src/common/enums/booking-type.enum';
import { ServiceLocationType } from 'src/common/enums/service-location-type.enum';

export class CreateBookingDto {
  @IsUUID('4', { message: 'Worker Service ID phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'Worker Service ID không được để trống' })
  workerServiceId: string;

  @IsEnum(BookingType, {
    message: 'Loại booking không hợp lệ (instant / scheduled)',
  })
  @IsNotEmpty()
  bookingType: BookingType;

  @IsEnum(ServiceLocationType, {
    message: 'Loại địa điểm không hợp lệ (home / at_shop)',
  })
  @IsNotEmpty()
  serviceLocationType: ServiceLocationType;

  @ValidateIf((o: CreateBookingDto) => o.bookingType === BookingType.SCHEDULED)
  @IsDateString({}, { message: 'Ngày hẹn không hợp lệ (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'Ngày hẹn bắt buộc khi đặt lịch' })
  scheduledDate?: string;

  @ValidateIf((o: CreateBookingDto) => o.bookingType === BookingType.SCHEDULED)
  @IsMilitaryTime({ message: 'Giờ hẹn không hợp lệ (HH:mm)' })
  @IsNotEmpty({ message: 'Giờ hẹn bắt buộc khi đặt lịch' })
  scheduledTime?: string;

  @ValidateIf(
    (o: CreateBookingDto) => o.serviceLocationType === ServiceLocationType.HOME,
  )
  @IsString({ message: 'Địa chỉ phải là chuỗi' })
  @IsNotEmpty({ message: 'Địa chỉ bắt buộc khi dịch vụ tại nhà' })
  address?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  customerNote?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;
}
