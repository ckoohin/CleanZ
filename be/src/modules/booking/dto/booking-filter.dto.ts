import { IsEnum, IsOptional, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { BookingType } from 'src/common/enums/booking-type.enum';
import { ServiceLocationType } from 'src/common/enums/service-location-type.enum';

export class BookingFilterDto {
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;

  @IsEnum(BookingType)
  @IsOptional()
  bookingType?: BookingType;

  @IsEnum(ServiceLocationType)
  @IsOptional()
  serviceLocationType?: ServiceLocationType;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}
