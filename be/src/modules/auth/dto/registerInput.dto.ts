import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsNotEmpty,
  Matches,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from 'src/common/enums/user-role.enum';

export class RegisterDto {
  @ApiProperty({
    example: 'staff01@example.com',
    description: 'Email đăng ký của người dùng',
  })
  @IsNotEmpty({ message: 'Email không được để trống nhé' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  email!: string;

  @ApiProperty({
    example: 'Str0ng@Pass123',
    minLength: 8,
    maxLength: 32,
    description: 'Mật khẩu phải có chữ thường, chữ hoa, số và ký tự đặc biệt',
  })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @MaxLength(32, { message: 'Mật khẩu không được vượt quá 32 ký tự' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message:
      'Mật khẩu phải có ít nhất 1 chữ thường, 1 chữ hoa, 1 số và 1 ký tự đặc biệt',
  })
  password!: string;

  @ApiProperty({
    example: 'Nguyen Van A',
    maxLength: 100,
    description: 'Họ và tên người dùng',
  })
  @IsString()
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @MaxLength(100, { message: 'Họ và tên không được vượt quá 100 ký tự' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  fullName!: string;

  @ApiProperty({
    example: 'CUSTOMER',
    enum: UserRole,
    description: 'Role của người dùng (mặc định là CUSTOMER)',
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Role không hợp lệ' })
  role?: UserRole;
}
