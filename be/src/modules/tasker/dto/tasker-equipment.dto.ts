import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class SubmitTaskerEquipmentDto {
  @ApiProperty({
    description:
      'Ảnh bộ dụng cụ chuyên dụng (đã upload qua /upload). Tối thiểu 1, tối đa 8 ảnh.',
    example: ['https://cdn.cleanz.vn/equipment/abc.jpg'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @IsUrl({}, { each: true })
  photoUrls!: string[];

  @ApiPropertyOptional({
    description:
      'Mô tả bộ dụng cụ (máy hút bụi công nghiệp, hoá chất sinh học…)',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

/** Admin chỉ được kết luận duyệt hoặc từ chối — PENDING/NONE do hệ thống đặt. */
export enum TaskerEquipmentReviewAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ReviewTaskerEquipmentDto {
  @ApiProperty({ enum: TaskerEquipmentReviewAction })
  @IsEnum(TaskerEquipmentReviewAction)
  action!: TaskerEquipmentReviewAction;

  @ApiPropertyOptional({
    description: 'Lý do từ chối / ghi chú của admin. Bắt buộc khi REJECT.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
