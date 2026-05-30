import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateStaffProfileDto {
  @IsString({ message: 'Kỹ năng phải là chuỗi' })
  @IsOptional()
  skills?: string;

  @IsString({ message: 'Số điện thoại phải là chuỗi' })
  @MaxLength(11, { message: 'Số điện thoại tối đa 11 số' })
  @IsOptional()
  phone?: string;

  @IsString({ message: 'Kinh nghiệm phải là chuỗi' })
  @IsOptional()
  experience?: string;

  @IsString({ message: 'Giới thiệu phải là chuỗi' })
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  addressResident?: string;

  @IsString()
  @IsOptional()
  addressCurrent?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankAccountNumber?: string;

  @IsString()
  @IsOptional()
  bankAccountName?: string;
}
