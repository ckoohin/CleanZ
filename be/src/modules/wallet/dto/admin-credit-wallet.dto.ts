import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Admin ghi nhận tasker nộp tiền mặt tại trụ sở → cộng thẳng vào ví.
 * Bút toán ADJUSTMENT, có lý do (bắt buộc) + số phiếu thu (tuỳ chọn) để đối soát.
 */
export class AdminCreditWalletDto {
  @ApiProperty({
    description: 'Số tiền cộng vào ví tasker (VND).',
    example: 400000,
  })
  @Type(() => Number)
  @IsInt({ message: 'Số tiền phải là số nguyên VND' })
  @Min(1000, { message: 'Số tiền tối thiểu là 1.000đ' })
  @Max(2000000, { message: 'Số tiền tối đa mỗi lần là 2.000.000đ' })
  amount!: number;

  @ApiProperty({
    description: 'Lý do cộng tiền (bắt buộc) — dùng để đối soát.',
    example: 'Nộp cọc tiền mặt tại trụ sở',
  })
  @IsString()
  @MinLength(3, { message: 'Lý do phải có ít nhất 3 ký tự' })
  @MaxLength(255, { message: 'Lý do tối đa 255 ký tự' })
  reason!: string;

  @ApiPropertyOptional({
    description: 'Số phiếu thu / mã chứng từ (tuỳ chọn).',
    example: 'PT-2026-000123',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64, { message: 'Số phiếu thu tối đa 64 ký tự' })
  referenceCode?: string;
}
