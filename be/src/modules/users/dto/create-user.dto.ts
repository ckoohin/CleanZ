import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { UserRole } from 'src/common/enums/user-role.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: 'newuser@example.com',
    description: 'Email tài khoản',
  })
  @IsString()
  @IsNotEmpty({ message: 'Email không được để trống' })
  email!: string;

  @ApiPropertyOptional({
    example: 'Str0ngPass1',
    minLength: 6,
    description: 'Mật khẩu người dùng (bắt buộc với account local)',
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Password không được để trống' })
  @MinLength(6, { message: 'Password phải có ít nhất 6 ký tự' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/, {
    message: 'Password phải chứa ít nhất một chữ hoa, một chữ thường và một số',
  })
  password!: string;

  @ApiProperty({
    example: 'Nguyen Thi B',
    maxLength: 100,
    description: 'Họ tên người dùng',
  })
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @MaxLength(100, { message: 'Họ tên không được vượt quá 100 ký tự' })
  fullName!: string;

  @ApiPropertyOptional({
    example: '0901234567',
    description: 'Số điện thoại người dùng',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^0\d{9,10}$/, {
    message: 'Số điện thoại phải bắt đầu bằng 0 và có 10-11 chữ số',
  })
  phone?: string;

  @IsEnum(UserRole, { message: 'Role phải là Tasker hoặc Customer' })
  @IsOptional()
  role?: UserRole;
}
