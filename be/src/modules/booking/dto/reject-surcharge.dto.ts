import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectSurchargeDto {
  @ApiPropertyOptional({
    description: 'Lý do khách không đồng ý trả phần phát sinh',
    maxLength: 500,
    example: 'Tôi không được báo trước về việc làm thêm giờ',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
