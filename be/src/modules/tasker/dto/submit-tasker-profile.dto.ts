import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskerDocumentType } from 'src/common/enums/type-docs-tasker.enum';

export class SubmitTaskerProfileDto {
  @ApiPropertyOptional({
    example: '12 Nguyễn Trãi, Thanh Xuân, Hà Nội',
    description: 'Địa chỉ/khu vực tasker muốn làm việc',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  workingAddress?: string;

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
    description: 'Kỹ năng của tasker (chuỗi tự do hoặc phân tách bởi dấu phẩy)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  skills?: string;

  @ApiProperty({
    example: '09876543210',
    description:
      'Số điện thoại tasker dùng để liên hệ. Không thể thay đổi sau khi hồ sơ được duyệt.',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^0\d{9,10}$/, {
    message: 'phone phải bắt đầu bằng 0 và có 10-11 chữ số',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  phone!: string;

  @ApiProperty({
    enum: TaskerDocumentType,
    example: TaskerDocumentType.CITIZEN_ID,
    description: 'Loại giấy tờ định danh',
  })
  @IsEnum(TaskerDocumentType)
  docType!: TaskerDocumentType;

  @ApiProperty({
    example: '001203000123',
    description: 'Số giấy tờ định danh',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  docIdNumber!: string;

  @ApiPropertyOptional({
    example: '2020-01-01',
    description: 'Ngày cấp giấy tờ, format YYYY-MM-DD',
  })
  @IsOptional()
  @IsDateString()
  docIssuedDate?: string;

  @ApiPropertyOptional({
    example: '2035-01-01',
    description: 'Ngày hết hạn giấy tờ, format YYYY-MM-DD',
  })
  @IsOptional()
  @IsDateString()
  docExpiredDate?: string;

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

  /**
   * Mã BIN là trường PayOS BẮT BUỘC để chi hộ — thiếu nó thì lệnh rút tiền bị từ
   * chối với `WITHDRAWAL_MISSING_BANK_BIN`. Wizard đăng ký đã bắt tasker chọn ngân
   * hàng từ `GET /wallet/banks` và gửi lên, nên phải khai ở đây: `forbidNonWhitelisted`
   * sẽ trả 422 cho mọi field không khai báo.
   */
  @ApiPropertyOptional({
    example: '970436',
    description: 'Mã BIN ngân hàng (lấy từ danh sách GET /wallet/banks)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  bankBin?: string;
}
