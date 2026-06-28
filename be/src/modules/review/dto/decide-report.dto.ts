import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum ReportDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class DecideReportDto {
  @ApiProperty({ enum: ReportDecision })
  @IsEnum(ReportDecision)
  decision!: ReportDecision;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
