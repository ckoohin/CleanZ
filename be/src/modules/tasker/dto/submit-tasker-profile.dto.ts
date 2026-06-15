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
}
