import { Type } from 'class-transformer';
import {
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

export class DamageItemInput {
  @ApiProperty({ example: 'Mặt bàn bị trầy xước' })
  @IsString()
  @MaxLength(255)
  description!: string;

  @ApiProperty({ example: 500000, description: 'VND, số nguyên dương' })
  @IsInt()
  @IsPositive()
  @Max(20_000_000)
  claimedAmount!: number;

  @ApiProperty({
    type: [String],
    description: 'Danh sách evidenceId đã upload trước (≥1 ảnh)',
  })
  @IsArray()
  @ArrayMinSize(1)
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
  description!: string;

  @ApiProperty({ type: [DamageItemInput] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DamageItemInput)
  damageItems!: DamageItemInput[];
}
