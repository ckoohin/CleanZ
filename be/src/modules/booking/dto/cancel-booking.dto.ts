import { IsString, IsOptional } from 'class-validator';

export class CancelBookingDto {
  @IsString({ message: 'Lý do hủy phải là chuỗi' })
  @IsOptional()
  cancellationReason?: string;
}
