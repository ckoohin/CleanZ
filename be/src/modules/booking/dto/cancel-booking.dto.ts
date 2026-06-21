import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelBookingDto {
  @ApiPropertyOptional({
    example: 'Tôi bận việc đột xuất',
    description: 'Lý do customer hủy booking',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
