import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';

export class CreateCustomerDto {
  @ApiProperty({ example: 'customer@example.com', description: 'Email tài khoản' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email!: string;

  // Mật khẩu KHÔNG do admin nhập: hệ thống tự sinh mật khẩu tạm và gửi qua email,
  // khách buộc đổi ở lần đăng nhập đầu tiên.

  @ApiProperty({ example: 'Nguyen Van A', maxLength: 100, description: 'Họ tên khách hàng' })
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @MaxLength(100, { message: 'Họ tên không được vượt quá 100 ký tự' })
  fullName!: string;

  @ApiPropertyOptional({ example: '0901234567', description: 'Số điện thoại khách hàng' })
  @IsOptional()
  @IsString()
  @Matches(/^0\d{9,10}$/, {
    message: 'Số điện thoại phải bắt đầu bằng 0 và có 10-11 chữ số',
  })
  phone?: string;

  @ApiPropertyOptional({ enum: PaymentMethod, description: 'Phương thức thanh toán mặc định' })
  @IsOptional()
  @IsEnum(PaymentMethod, { message: 'Phương thức thanh toán không hợp lệ' })
  defaultPaymentMethod?: PaymentMethod;
}
