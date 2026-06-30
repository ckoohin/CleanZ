import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class AdminUpdateTaskerWorkStatusDto {
  @ApiPropertyOptional({
    example: true,
    description:
      'Nếu true, admin chủ động xóa khóa nhận đơn do tasker hủy quá số lần cho phép.',
  })
  @IsOptional()
  @IsBoolean()
  clearCancelSuspension?: boolean;
}
