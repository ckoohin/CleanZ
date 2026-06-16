import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus } from 'src/common/enums/document-status.enum';

export class ReviewTaskerProfileDto {
  @ApiProperty({
    enum: [DocumentStatus.APPROVED, DocumentStatus.REJECTED],
    example: DocumentStatus.APPROVED,
    description: 'Kết quả duyệt hồ sơ tasker',
  })
  @IsIn([DocumentStatus.APPROVED, DocumentStatus.REJECTED])
  status!: DocumentStatus.APPROVED | DocumentStatus.REJECTED;

  @ApiPropertyOptional({
    example: 'Ảnh giấy tờ bị mờ, vui lòng upload lại.',
    description: 'Lý do từ chối. Bắt buộc khi status = REJECTED.',
  })
  @ValidateIf(
    (dto: ReviewTaskerProfileDto) => dto.status === DocumentStatus.REJECTED,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  reason?: string;
}
