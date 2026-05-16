import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class AssignStaffDto {
  @ApiProperty({
    description: 'ID của staff cần gán cho booking',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty({ message: 'Vui lòng chọn nhân viên' })
  staffId!: string;

  @ApiPropertyOptional({
    description:
      'Bỏ qua kiểm tra staff_service. Gửi lần 2 sau khi nhận được error từ lần 1.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  forceAssign?: boolean;
}
