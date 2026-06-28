import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReviewReportReason } from 'src/common/enums/review-report-reason.enum';

export class ReportReviewDto {
  @ApiProperty({ enum: ReviewReportReason })
  @IsEnum(ReviewReportReason)
  reason!: ReviewReportReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
