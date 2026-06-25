import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsInt,
  MaxLength,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateWorkflowStepDto } from './create-workflow-step.dto';

export class CreateWorkflowDto {
  @ApiPropertyOptional({ description: 'UUID của dịch vụ con (hoặc bỏ trống nếu gắn vào package)' })
  @IsOptional()
  @IsUUID()
  subServiceId?: string;

  @ApiPropertyOptional({ description: 'UUID của gói dịch vụ (hoặc bỏ trống nếu gắn vào sub-service)' })
  @IsOptional()
  @IsUUID()
  packageId?: string;

  @ApiProperty({ example: 'Quy trình vệ sinh căn hộ tiêu chuẩn' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'Áp dụng cho gói dọn dẹp cơ bản 1-2 phòng ngủ' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  /** Tạo steps ngay khi tạo workflow (optional) */
  @ApiPropertyOptional({ type: [CreateWorkflowStepDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkflowStepDto)
  steps?: CreateWorkflowStepDto[];
}
