import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

/** Khoảng thời gian mặc định khi admin không chọn (30 ngày gần nhất). */
export const STATS_DEFAULT_DAYS = 30;

export class StatsQueryDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
