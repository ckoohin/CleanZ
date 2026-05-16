import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelBookingDto {
  @ApiPropertyOptional({
    description: 'Lý do hủy booking',
    example: 'Có việc đột xuất, không thể sắp xếp được thời gian',
  })
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}
