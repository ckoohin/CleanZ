import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStaffProfileDto {
  @IsOptional()
  @IsString({ message: 'Kỹ năng phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Kỹ năng không được vượt quá 500 ký tự' })
  skills?: string;

  @ApiPropertyOptional({
    example: '0909123456',
    description: 'Số điện thoại 10-11 chữ số',
  })
  @IsOptional()
  @Matches(/^[0-9]{10,11}$/, {
    message: 'Số điện thoại phải có độ dài từ 10 đến 11 ký tự',
  })
  phone!: string;

  @ApiPropertyOptional({
    example: '3 năm kinh nghiệm thi công điện lạnh dân dụng',
    maxLength: 1000,
    description: 'Kinh nghiệm làm việc',
  })
  @IsOptional()
  @IsString({ message: 'Kinh nghiệm phải là chuỗi ký tự' })
  @MaxLength(1000, { message: 'Kinh nghiệm không được vượt quá 1000 ký tự' })
  experience?: string;

  @ApiPropertyOptional({
    example: 'Thợ kỹ thuật làm việc toàn thời gian tại TP.HCM',
    maxLength: 1000,
    description: 'Giới thiệu ngắn về staff',
  })
  @IsOptional()
  @IsString({ message: 'Bio phải là chuỗi ký tự' })
  @MaxLength(1000, { message: 'Bio không được vượt quá 1000 ký tự' })
  bio?: string;
}
