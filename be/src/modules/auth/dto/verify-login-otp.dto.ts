import { IsNotEmpty, IsNumberString, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyLoginOtpDto {
  @ApiProperty({
    example: 'c603ce7f-8626-4e4a-8f4f-00c09df6a605',
    description: 'ID người dùng trả về từ bước login',
  })
  @IsString()
  @IsNotEmpty({ message: 'User ID không được để trống' })
  userId: string;

  @ApiProperty({
    example: '123456',
    minLength: 6,
    maxLength: 6,
    description: 'Mã OTP 6 số gửi qua email',
  })
  @IsNumberString({}, { message: 'Mã OTP phải là số' })
  @IsNotEmpty({ message: 'Mã OTP không được để trống' })
  @Length(6, 6, { message: 'Mã OTP phải có đúng 6 số' })
  otp: string;
}
