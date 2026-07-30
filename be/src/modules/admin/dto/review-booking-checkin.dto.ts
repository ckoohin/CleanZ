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

export enum AdminCheckinReviewDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  MARK_NOT_VERIFIABLE = 'MARK_NOT_VERIFIABLE',
}

export class ReviewBookingCheckinDto {
  @ApiProperty({ enum: AdminCheckinReviewDecision })
  @IsEnum(AdminCheckinReviewDecision)
  decision!: AdminCheckinReviewDecision;

  @ApiProperty({
    example: 'Ảnh và vị trí hiện trường không khớp với địa chỉ của booking',
    minLength: 3,
    maxLength: 1000,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;

  @ApiPropertyOptional({
    description:
      'Chỉ dùng khi REJECT: mở hồ sơ Incident để tiếp tục xác minh và bồi thường',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  openIncident?: boolean;

  @ApiPropertyOptional({
    description:
      'Số tiền customer yêu cầu ban đầu; Incident vẫn phải qua xác minh và phê duyệt trước khi chi',
    example: 200000,
    minimum: 1,
    maximum: 20000000,
  })
  @ValidateIf((dto: ReviewBookingCheckinDto) => dto.openIncident === true)
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(20_000_000)
  claimedAmount?: number;
}
