import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'Nguyen Van A', maxLength: 100, description: 'Họ tên khách hàng' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @MaxLength(100, { message: 'Họ tên không được vượt quá 100 ký tự' })
  fullName?: string;

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
