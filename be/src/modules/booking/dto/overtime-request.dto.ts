import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class RespondOvertimeDto {
  @ApiProperty({
    description: 'Khách đồng ý hay từ chối yêu cầu thêm giờ',
    enum: ['APPROVE', 'REJECT'],
    example: 'APPROVE',
  })
  @IsIn(['APPROVE', 'REJECT'])
  action!: 'APPROVE' | 'REJECT';
}
