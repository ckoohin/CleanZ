import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AssignTaskerDto {
  @ApiProperty({
    description: 'ID trong bảng taskers',
    format: 'uuid',
  })
  @IsUUID()
  taskerId!: string;

  @ApiPropertyOptional({
    description: 'Lý do hoặc ghi chú khi Admin gán/thay Tasker',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  note?: string;
}
