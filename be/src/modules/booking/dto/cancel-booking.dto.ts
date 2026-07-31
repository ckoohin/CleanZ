import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CancelBookingDto {
  @ApiPropertyOptional({
    example: 'Tôi bận việc đột xuất',
    description: 'Lý do customer hủy booking',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    description:
      'Version policy phí hủy mà Tasker đã xem trước. Backend từ chối nếu policy vừa thay đổi.',
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedPenaltyPolicyVersion?: number;
}
