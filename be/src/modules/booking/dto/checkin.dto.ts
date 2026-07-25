import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
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
    example: 'https://cdn.cleanz.online/uploads/checkin-proof.jpg',
    description:
      'Ảnh minh chứng khi check-in ngoài bán kính cho phép (hoặc không lấy được GPS)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  proofPhotoUrl?: string;
}
