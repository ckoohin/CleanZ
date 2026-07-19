import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, Matches } from 'class-validator';

export const TASKER_EARNINGS_PERIODS = [
  'today',
  'week',
  'month',
  'year',
] as const;

export type TaskerEarningsPeriod = (typeof TASKER_EARNINGS_PERIODS)[number];

export class TaskerEarningsBreakdownQueryDto {
  @ApiProperty({
    enum: TASKER_EARNINGS_PERIODS,
    example: 'week',
    description:
      'Hôm nay chia theo giờ; tuần/tháng chia theo ngày; năm chia theo tháng',
  })
  @IsIn(TASKER_EARNINGS_PERIODS)
  period!: TaskerEarningsPeriod;

  @ApiPropertyOptional({
    example: '2026-07-13',
    description:
      'Một ngày nằm trong tuần/tháng/năm cần xem. Bỏ trống để xem kỳ hiện tại.',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  anchor?: string;
}
