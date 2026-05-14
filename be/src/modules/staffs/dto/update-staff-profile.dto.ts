import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateStaffProfileDto {
  @IsOptional()
  @IsString({ message: 'Kỹ năng phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Kỹ năng không được vượt quá 500 ký tự' })
  skills?: string;

  @IsOptional()
  @Matches(/^[0-9]{10,11}$/, {
    message: 'Số điện thoại phải có độ dài từ 10 đến 11 ký tự',
  })
  phone!: string;

  @IsOptional()
  @IsString({ message: 'Kinh nghiệm phải là chuỗi ký tự' })
  @MaxLength(1000, { message: 'Kinh nghiệm không được vượt quá 1000 ký tự' })
  experience?: string;

  @IsOptional()
  @IsString({ message: 'Bio phải là chuỗi ký tự' })
  @MaxLength(1000, { message: 'Bio không được vượt quá 1000 ký tự' })
  bio?: string;
}
