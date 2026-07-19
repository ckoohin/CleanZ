import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Tasker/applicant tự cập nhật thông tin hồ sơ (không gồm giấy tờ — giấy tờ đi
 * qua PATCH /tasker/profile/documents). Mọi field đều optional: chỉ field gửi
 * lên mới được ghi đè.
 */
export class UpdateMyProfileDto {
  @ApiPropertyOptional({
    example: '0987654321',
    description: 'Số điện thoại liên hệ',
  })
  @IsOptional()
  @IsString()
  @Matches(/^0\d{9,10}$/, {
    message: 'phone phải bắt đầu bằng 0 và có 10-11 chữ số',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  phone?: string;

  @ApiPropertyOptional({
    example: 'Tôi có 2 năm kinh nghiệm dọn dẹp căn hộ và nhà phố.',
    description: 'Giới thiệu ngắn về tasker',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  bio?: string;

  @ApiPropertyOptional({
    example: '3 năm làm dọn dẹp văn phòng và nhà ở.',
    description: 'Kinh nghiệm làm việc của tasker',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  experience?: string;

  @ApiPropertyOptional({
    example: 'Dọn dẹp, giặt ủi, nấu ăn',
    description: 'Kỹ năng của tasker',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  skills?: string;

  @ApiPropertyOptional({
    example: '12 Nguyễn Trãi, Thanh Xuân, Hà Nội',
    description:
      'Địa chỉ hiện tại (map vào workingAddress — dùng để tìm việc gần)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  addressCurrent?: string;

  @ApiPropertyOptional({
    example: 'Vietcombank',
    description: 'Tên ngân hàng nhận thanh toán',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  bankName?: string;

  @ApiPropertyOptional({
    example: '1234567890',
    description: 'Số tài khoản ngân hàng',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  bankAccountNumber?: string;

  @ApiPropertyOptional({
    example: 'NGUYEN VAN A',
    description: 'Tên chủ tài khoản ngân hàng',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  bankAccountName?: string;
}
