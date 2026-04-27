import {
  IsOptional,
  IsString,
  MaxLength,
  IsEnum,
  Matches,
} from 'class-validator';
import { Gender } from '../entities/customer.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCustomerDto {
  @ApiPropertyOptional({
    example: '123 Nguyen Trai, Q.1, TP.HCM',
    maxLength: 255,
    description: 'Địa chỉ khách hàng',
  })
  @IsOptional()
  @IsString({ message: 'Địa chỉ phải là chuỗi ký tự' })
  @MaxLength(255, { message: 'Địa chỉ không được vượt quá 255 ký tự' })
  address?: string;

  @ApiPropertyOptional({
    example: '0909123456',
    description: 'Số điện thoại 10-11 số, bắt đầu bằng 0',
  })
  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  @Matches(/^0\d{9,10}$/, {
    message: 'Số điện thoại không hợp lệ (phải bắt đầu bằng 0 và có 10-11 số)',
  })
  phone?: string;

  @ApiPropertyOptional({
    enum: Gender,
    example: Gender.MALE,
    description: 'Giới tính',
  })
  @IsOptional()
  @IsEnum(Gender, { message: 'Giới tính không hợp lệ' })
  gender?: Gender;
}
