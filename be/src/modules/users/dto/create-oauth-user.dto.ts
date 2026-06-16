import { AuthProvider } from 'src/common/enums/auth-provider.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateOAuthUserDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email tài khoản' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'Nguyen Van A', description: 'Họ tên đầy đủ' })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({ enum: AuthProvider, description: 'Nhà cung cấp OAuth' })
  @IsEnum(AuthProvider)
  provider!: AuthProvider;

  @ApiPropertyOptional({
    example: '0901234567',
    description: 'Số điện thoại (nếu có)',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'ID nhà cung cấp OAuth' })
  @IsString()
  @IsNotEmpty()
  providerId!: string;

  @ApiPropertyOptional({ example: 'Nguyen', description: 'Tên' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Van A', description: 'Họ' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: 'https://...', description: 'Avatar URL' })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({
    example: 'ya29.a0Af...',
    description: 'Access token OAuth',
  })
  @IsString()
  @IsOptional()
  accessToken?: string;
}
