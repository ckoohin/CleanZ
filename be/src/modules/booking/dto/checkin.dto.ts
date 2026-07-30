import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { OptionalTaskerBookingLocationDto } from './tasker-booking-location.dto';

/**
 * Body của PATCH tasker/:id/check-in.
 *
 * Tọa độ optional vì tasker có thể từ chối quyền định vị — khi đó backend coi
 * như đang ở ngoài bán kính cho phép và yêu cầu ảnh minh chứng. Backend là nơi
 * quyết định 50m, FE không tự tính.
 */
export class CheckinDto extends OptionalTaskerBookingLocationDto {
  @ApiProperty({
    example: 12.4,
    description:
      'Độ chính xác GPS thiết bị báo tại thời điểm check-in (mét). Thiếu giá trị hoặc sai số trên 100m thì phải kèm ảnh và chờ Admin hậu kiểm.',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100_000)
  accuracyMeters?: number;

  @ApiProperty({
    example: 'https://cdn.cleanz.online/uploads/checkin-proof.jpg',
    description:
      'Ảnh minh chứng khi check-in ngoài bán kính cho phép (hoặc không lấy được GPS)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUrl({
    protocols: ['https'],
    require_protocol: true,
    require_tld: false,
  })
  @MaxLength(500)
  proofPhotoUrl?: string;
}
