import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export enum AdminNoShowReviewDecision {
  CONFIRM_NO_SHOW = 'CONFIRM_NO_SHOW',
  EXCUSE_TASKER = 'EXCUSE_TASKER',
}

export class ReviewBookingNoShowDto {
  @ApiProperty({ enum: AdminNoShowReviewDecision })
  @IsEnum(AdminNoShowReviewDecision)
  decision!: AdminNoShowReviewDecision;

  @ApiProperty({
    description: 'Căn cứ để Admin xác nhận vi phạm hoặc miễn trách nhiệm',
    example:
      'Không có bằng chứng bất khả kháng; lịch sử cuộc gọi không thể hiện Tasker đã liên hệ khách.',
    minLength: 10,
    maxLength: 1000,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason!: string;

  @ApiPropertyOptional({
    description:
      'Chỉ dùng khi xác nhận no-show: mở Incident để tiếp tục xác minh khoản bồi thường bổ sung',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  openIncident?: boolean;

  @ApiPropertyOptional({
    description:
      'Số tiền customer yêu cầu ban đầu; tiền chỉ được chi sau quy trình Incident',
    example: 100000,
    minimum: 1,
    maximum: 20000000,
  })
  @ValidateIf((dto: ReviewBookingNoShowDto) => dto.openIncident === true)
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(20_000_000)
  claimedAmount?: number;
}
