import {
  IsOptional,
  IsString,
  MaxLength,
  IsEnum,
  Matches,
} from 'class-validator';
import { Gender } from '../entities/customer.entity';

export class UpdateCustomerDto {
  @IsOptional()
  @IsString({ message: 'Địa chỉ phải là chuỗi ký tự' })
  @MaxLength(255, { message: 'Địa chỉ không được vượt quá 255 ký tự' })
  address?: string;

  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  @Matches(/^0\d{9,10}$/, {
    message: 'Số điện thoại không hợp lệ (phải bắt đầu bằng 0 và có 10-11 số)',
  })
  phone?: string;

  @IsOptional()
  @IsEnum(Gender, { message: 'Giới tính không hợp lệ' })
  gender?: Gender;
}
