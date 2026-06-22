import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CreateBookingDto } from 'src/modules/booking/dto/create-booking.dto';

export class CreateAdminBookingDto extends CreateBookingDto {
  @ApiProperty({
    description: 'ID trong bảng customers',
    format: 'uuid',
  })
  @IsUUID()
  customerId!: string;

  @ApiPropertyOptional({
    description:
      'Tasker được Admin chỉ định. Bỏ trống để booking ở trạng thái POSTED.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  taskerId?: string;

  @ApiProperty({
    description: 'Lý do Admin tạo booking thủ công',
    example: 'Tạo hộ khách hàng theo yêu cầu qua hotline',
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
