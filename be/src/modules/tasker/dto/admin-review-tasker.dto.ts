import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminReviewTaskerDto {
  @ApiProperty({ example: 'Ảnh CCCD bị mờ, vui lòng chụp lại.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  notes!: string;
}
