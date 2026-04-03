import { IsInt, IsString, IsOptional, Min, Max } from 'class-validator';

export class ReviewBookingDto {
  @IsInt({ message: 'Đánh giá phải là số nguyên' })
  @Min(1, { message: 'Đánh giá tối thiểu là 1' })
  @Max(5, { message: 'Đánh giá tối đa là 5' })
  rating: number;

  @IsString()
  @IsOptional()
  review?: string;
}
