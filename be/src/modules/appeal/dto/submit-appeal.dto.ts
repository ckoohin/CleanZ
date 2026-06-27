import { IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitAppealDto {
  /** Token kháng cáo lấy từ link trong email khóa tài khoản. */
  @IsString()
  token!: string;

  /** Nội dung kháng cáo do tasker nhập. */
  @IsString()
  @MinLength(10, { message: 'Nội dung kháng cáo cần ít nhất 10 ký tự' })
  @MaxLength(2000, { message: 'Nội dung kháng cáo tối đa 2000 ký tự' })
  content!: string;
}
