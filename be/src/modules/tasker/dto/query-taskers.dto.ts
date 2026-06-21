import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus } from 'src/common/enums/document-status.enum';
import { TaskerStatus } from 'src/common/enums/tasker-status.enum';

export class QueryTaskersDto {
  @ApiPropertyOptional({ enum: TaskerStatus })
  @IsOptional()
  @IsEnum(TaskerStatus)
  status?: TaskerStatus;

  @ApiPropertyOptional({ enum: DocumentStatus })
  @IsOptional()
  @IsEnum(DocumentStatus)
  docStatus?: DocumentStatus;

  @ApiPropertyOptional({
    example: 'nguyen',
    description: 'Tìm theo tên hoặc email',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  keyword?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
