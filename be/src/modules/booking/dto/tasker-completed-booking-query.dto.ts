import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TaskerCompletedBookingQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;

  @ApiPropertyOptional({ description: 'Mốc hoàn tất bắt đầu, ISO 8601' })
  @IsOptional()
  @IsDateString()
  fromAt?: string;

  @ApiPropertyOptional({ description: 'Mốc hoàn tất kết thúc, ISO 8601' })
  @IsOptional()
  @IsDateString()
  toAt?: string;
}
