import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Khôi phục tasker đã bị chấm dứt vĩnh viễn (TERMINATED) sau kháng cáo hợp lý.
 * `reason` (lý do chấp nhận kháng cáo) là tùy chọn — ghi vào log audit.
 */
export class ReinstateTaskerDto {
  @ApiPropertyOptional({ example: 'Kháng cáo hợp lệ — nhầm lẫn khi xử lý.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  reason?: string;
}
