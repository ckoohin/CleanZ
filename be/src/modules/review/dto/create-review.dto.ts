import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  overallRating!: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 5, default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  punctuality?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 5, default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  cleanliness?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 5, default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  friendliness?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 5, default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  satisfaction?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  @MaxLength(5, { message: 'Tối đa 5 ảnh' })
  images?: string[];
}
