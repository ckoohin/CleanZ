import {
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RevenuePayrollQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

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

  @ApiPropertyOptional({
    description: 'Search by booking code, customer name or tasker name',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
