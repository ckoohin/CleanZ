import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateCustomerProfileDto {
  @ApiPropertyOptional({
    example: 'Nguyen Van A',
    maxLength: 100,
    description: 'Họ tên customer',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({
    example: '0901234567',
    description: 'Số điện thoại bắt buộc để có thể đặt booking',
  })
  @IsOptional()
  @IsString()
  @Matches(/^0\d{9,10}$/, {
    message: 'Số điện thoại phải bắt đầu bằng 0 và có 10-11 chữ số',
  })
  phone?: string;
}
