import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateWorkerProfileDto {
  @IsOptional()
  @IsString({ message: 'Kỹ năng phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Kỹ năng không được vượt quá 500 ký tự' })
  skills?: string;

  @IsOptional()
  @IsString({ message: 'Kinh nghiệm phải là chuỗi ký tự' })
  @MaxLength(1000, { message: 'Kinh nghiệm không được vượt quá 1000 ký tự' })
  experience?: string;

  @IsOptional()
  @IsString({ message: 'Bio phải là chuỗi ký tự' })
  @MaxLength(1000, { message: 'Bio không được vượt quá 1000 ký tự' })
  bio?: string;
}
