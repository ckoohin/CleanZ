import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BlogStatus } from '../entity/blog.entity';

export class UpdateBlogStatusDto {
  @ApiProperty({ enum: BlogStatus })
  @IsEnum(BlogStatus)
  status!: BlogStatus;
}
