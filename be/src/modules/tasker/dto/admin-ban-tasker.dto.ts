import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BanType } from 'src/common/enums/ban-type.enum';

export class AdminBanTaskerDto {
  @ApiProperty({ example: 'Vi phạm quy định nền tảng lần thứ 3.' })
  @IsString()
  @IsNotEmpty()
  // banReason lưu kèm prefix loại ban → giới hạn 488 để tổng không vượt varchar(500).
  @MaxLength(488)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  reason!: string;

  @ApiProperty({ enum: BanType, example: BanType.TEMPORARY })
  @IsEnum(BanType)
  type!: BanType;

  /**
   * Số ngày khóa (chỉ áp dụng với TEMPORARY). Bỏ trống → mặc định 7 ngày.
   * PERMANENT bỏ qua giá trị này.
   */
  @ApiPropertyOptional({ example: 7, minimum: 1, maximum: 365 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  durationDays?: number;
}
