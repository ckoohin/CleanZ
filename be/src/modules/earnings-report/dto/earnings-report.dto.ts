import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { EarningsReportDeliveryStatus } from 'src/common/enums/earnings-report-delivery-status.enum';
import { EarningsReportPeriodType } from 'src/common/enums/earnings-report-period-type.enum';
import type { EarningsReportPeriod } from 'src/common/helpers/earnings-period.helper';

/** Kỳ báo cáo nhận từ client — trùng giá trị với `EarningsReportPeriod`. */
export enum EarningsReportPeriodDto {
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export const DTO_TO_PERIOD: Record<
  EarningsReportPeriodDto,
  EarningsReportPeriod
> = {
  [EarningsReportPeriodDto.WEEK]: 'week',
  [EarningsReportPeriodDto.MONTH]: 'month',
  [EarningsReportPeriodDto.YEAR]: 'year',
};

const ANCHOR_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ANCHOR_DESC =
  'Ngày bất kỳ nằm trong kỳ muốn gửi (YYYY-MM-DD, giờ VN). Bỏ trống = kỳ vừa kết thúc.';

export class SendEarningsReportDto {
  @ApiProperty({ enum: EarningsReportPeriodDto })
  @IsEnum(EarningsReportPeriodDto)
  period!: EarningsReportPeriodDto;

  @ApiPropertyOptional({ description: ANCHOR_DESC, example: '2026-07-15' })
  @IsOptional()
  @Matches(ANCHOR_PATTERN, { message: 'anchor phải có dạng YYYY-MM-DD' })
  anchor?: string;

  @ApiPropertyOptional({
    description:
      'Bỏ trống để gửi cho mọi Tasker có đơn hoàn thành trong kỳ. Tối đa 500 ID.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  taskerIds?: string[];
}

export class EarningsReportPreviewQueryDto {
  @ApiProperty()
  @IsUUID('4')
  taskerId!: string;

  @ApiProperty({ enum: EarningsReportPeriodDto })
  @IsEnum(EarningsReportPeriodDto)
  period!: EarningsReportPeriodDto;

  @ApiPropertyOptional({ description: ANCHOR_DESC, example: '2026-07-15' })
  @IsOptional()
  @Matches(ANCHOR_PATTERN, { message: 'anchor phải có dạng YYYY-MM-DD' })
  anchor?: string;
}

export class EarningsReportRunQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: EarningsReportPeriodType })
  @IsOptional()
  @IsEnum(EarningsReportPeriodType)
  periodType?: EarningsReportPeriodType;
}

export class EarningsReportRunDetailQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @ApiPropertyOptional({ enum: EarningsReportDeliveryStatus })
  @IsOptional()
  @IsEnum(EarningsReportDeliveryStatus)
  status?: EarningsReportDeliveryStatus;
}
