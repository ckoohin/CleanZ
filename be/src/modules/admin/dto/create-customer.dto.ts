import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';

export class CreateCustomerDto {
  @ApiProperty({ example: 'customer@example.com', description: 'Email tài khoản' })
  @IsString()
  @IsNotEmpty({ message: 'Email không được để trống' })
  email!: string;

  @ApiProperty({
    example: 'Str0ngPass1',
    minLength: 6,
    description: 'Mật khẩu khách hàng',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/, {
    message: 'Mật khẩu phải chứa ít nhất một chữ hoa, một chữ thường và một số',
  })
  password!: string;

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
