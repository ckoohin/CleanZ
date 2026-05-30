import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class AdminReviewDto {
  @IsString()
  @IsNotEmpty({ message: 'Lý do/Phản hồi không được để trống' })
  @MaxLength(1000, { message: 'Nội dung phản hồi quá dài' })
  notes!: string;
}
