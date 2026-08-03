import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RevenueQueryDto {
  @ApiPropertyOptional({
    enum: ['day', 'week', 'month'],
    default: 'month',
    description: 'Grouping granularity',
  })
  @IsOptional()
  @IsString()
  granularity?: 'day' | 'week' | 'month' = 'month';

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Filter by tasker ID' })
  @IsOptional()
  @IsString()
  taskerId?: string;

  @ApiPropertyOptional({ description: 'Filter by service package ID' })
  @IsOptional()
  @IsString()
  serviceId?: string;
}
