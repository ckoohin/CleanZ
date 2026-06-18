import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  IsNotEmpty,
  MaxLength,
  IsDate,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePeakDayConfigDto {
  @ApiProperty({ example: 'Tết Nguyên Đán 2026' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({
    example: '2026-02-14T00:00:00.000Z',
    description: 'Optional start of the applicable date range',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startAt?: Date | null;

  @ApiPropertyOptional({
    example: '2026-02-22T23:59:59.000Z',
    description: 'Optional exclusive end of the applicable date range',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endAt?: Date | null;

  @ApiPropertyOptional({
    example: '18:00:00',
    description: 'Optional daily start time',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
  startTime?: string | null;

  @ApiPropertyOptional({
    example: '23:59:59',
    description: 'Optional daily exclusive end time',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
  endTime?: string | null;

  @ApiProperty({
    example: 0.1,
    description: 'Peak surcharge rate. 0.1 means 10%',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1)
  @Type(() => Number)
  peakRate!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
