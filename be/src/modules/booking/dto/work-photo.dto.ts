import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export const WORK_PHOTOS_MAX_PER_PHASE = 10;
export const WORK_PHOTOS_MIN_AFTER = 1;
export class WorkPhotoItemDto {
  @ApiProperty({
    example: 'https://res.cloudinary.com/cleanz/image/upload/v1/work-1.jpg',
    description: 'URL ảnh đã upload qua POST /upload/image',
  })
  @IsString()
  @IsUrl({
    protocols: ['https'],
    require_protocol: true,
    require_tld: false,
  })
  @MaxLength(500)
  url!: string;

  @ApiProperty({
    example: 'CleanZ/booking-work/abc123',
    description:
      'public_id trả về từ upload — để dọn file trên storage khi cần',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  publicId?: string;
}

export class StartWorkDto {
  @ApiProperty({
    type: [WorkPhotoItemDto],
    required: false,
    description: `Ảnh đầu ca (tùy chọn), tối đa ${WORK_PHOTOS_MAX_PER_PHASE} ảnh`,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(WORK_PHOTOS_MAX_PER_PHASE)
  @ValidateNested({ each: true })
  @Type(() => WorkPhotoItemDto)
  beforePhotos?: WorkPhotoItemDto[];
}

export class CompleteWorkDto {
  /**
   * Ràng buộc "tối thiểu 1 ảnh" nằm ở service, KHÔNG ở decorator: ValidationPipe trả
   * 422 với message gộp chung ("Thông tin gửi lên không hợp lệ"), còn tasker đang đứng
   * ở hiện trường cần biết chính xác mình thiếu gì mới được nhận tiền.
   */
  @ApiProperty({
    type: [WorkPhotoItemDto],
    description:
      `Ảnh cuối ca — bắt buộc tối thiểu ${WORK_PHOTOS_MIN_AFTER} ảnh, ` +
      `tối đa ${WORK_PHOTOS_MAX_PER_PHASE} ảnh`,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(WORK_PHOTOS_MAX_PER_PHASE)
  @ValidateNested({ each: true })
  @Type(() => WorkPhotoItemDto)
  afterPhotos?: WorkPhotoItemDto[];
}
