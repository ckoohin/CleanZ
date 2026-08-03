import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IC_INPUT_LIMITS } from '../incident.constants';

export class DamageItemInput {
  @ApiProperty({ example: 'Mặt bàn bị trầy xước' })
  @IsString()
  @MaxLength(255)
  description!: string;

  /**
   * Trần THẬT là `INCIDENT_CLAIM_MAX_AMOUNT`, áp cho TỔNG và do service kiểm. Ở đây chỉ chặn
   * số phi lý — nếu chép trần chính sách vào decorator thì hạ config sẽ không có tác dụng.
   */
  @ApiProperty({ example: 500000, description: 'VND, số nguyên dương' })
  @IsInt()
  @IsPositive()
  @Max(IC_INPUT_LIMITS.AMOUNT_SANITY_MAX)
  claimedAmount!: number;

  @ApiProperty({
    type: [String],
    description: 'Danh sách evidenceId đã upload trước (≥1 ảnh)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(IC_INPUT_LIMITS.EVIDENCE_MAX)
  @IsUUID('4', { each: true })
  evidenceIds!: string[];
}

export class CreateIncidentDto {
  @ApiProperty({ example: '7b9a2fe1-5a25-4f01-8e5d-54f2625df69f' })
  @IsUUID('4')
  bookingId!: string;

  @ApiProperty({ example: 'Hư hỏng tài sản sau ca dọn' })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ example: 'Tasker làm vỡ bình hoa và trầy mặt bàn.' })
  @IsString()
  @MaxLength(IC_INPUT_LIMITS.DESCRIPTION_MAX)
  description!: string;

  /**
   * Có trần vì service ghi từng hạng mục bằng một INSERT riêng trong CÙNG một transaction:
   * không chặn thì một request hợp lệ về mặt kiểu dữ liệu vẫn mở được transaction hàng nghìn
   * lệnh, giữ khoá và bơm phồng cả `claimedAmount` lẫn khoản hold ví Tasker.
   */
  @ApiProperty({ type: [DamageItemInput] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(IC_INPUT_LIMITS.DAMAGE_ITEMS_MAX)
  @ValidateNested({ each: true })
  @Type(() => DamageItemInput)
  damageItems!: DamageItemInput[];
}
