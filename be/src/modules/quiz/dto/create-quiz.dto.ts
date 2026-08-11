import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQuizDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-1)
  timeLimitMinutes?: number = -1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-1)
  maxAttempts?: number = 3;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  passingScore?: number = 80;
}
