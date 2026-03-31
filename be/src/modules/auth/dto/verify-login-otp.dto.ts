import { IsNotEmpty, IsNumberString, IsString, Length } from 'class-validator';

export class VerifyLoginOtpDto {
  @IsString()
  @IsNotEmpty({ message: 'User ID không được để trống' })
  userId: string;

  @IsNumberString({}, { message: 'Mã OTP phải là số' })
  @IsNotEmpty({ message: 'Mã OTP không được để trống' })
  @Length(6, 6, { message: 'Mã OTP phải có đúng 6 số' })
  otp: string;
}
