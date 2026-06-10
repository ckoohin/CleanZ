import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsNotEmpty,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from 'src/common/enums/user-role.enum';

export class LoginDto {
  @ApiProperty({
    example: 'staff01@example.com',
    description: 'Email dùng để đăng nhập',
  })
  @IsString()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  email!: string;

  @ApiProperty({
    example: 'Str0ng@Pass123',
    minLength: 8,
    maxLength: 32,
    description: 'Mật khẩu tài khoản',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MaxLength(32, { message: 'Mật khẩu không dài quá 32 ký tự' })
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  password!: string;

  @ApiPropertyOptional({
    enum: UserRole,
    description: 'Quyền (Role) mong đợi của portal đang đăng nhập',
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Role không hợp lệ' })
  role?: UserRole;
}
