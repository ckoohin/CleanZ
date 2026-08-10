import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { BookingAbsenceReportStatus } from 'src/common/enums/booking-absence-report-status.enum';

export class AbsenceReportQueryDto {
  @ApiPropertyOptional({ enum: BookingAbsenceReportStatus })
  @IsOptional()
  @IsEnum(BookingAbsenceReportStatus)
  status?: BookingAbsenceReportStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export enum AbsenceReviewDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ReviewAbsenceReportDto {
  @ApiProperty({ enum: AbsenceReviewDecision })
  @IsEnum(AbsenceReviewDecision)
  decision!: AbsenceReviewDecision;

  @ApiPropertyOptional({
    description: 'Bắt buộc khi từ chối; nếu duyệt có thể để trống',
    minLength: 10,
    maxLength: 1000,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf(
    (dto: ReviewAbsenceReportDto) =>
      dto.decision === AbsenceReviewDecision.REJECT || dto.reason !== undefined,
  )
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason?: string;
}

export class BulkReviewAbsenceReportsDto {
  @ApiProperty({ type: [String], maxItems: 100 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  reportIds!: string[];
}

export class WriteOffCustomerDebtDto {
  @ApiProperty({ minLength: 10, maxLength: 1000 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason!: string;
}
