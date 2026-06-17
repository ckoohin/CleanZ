import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminBanTaskerDto {
  @ApiProperty({ example: 'Vi phạm quy định nền tảng lần thứ 3.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  reason!: string;

  @ApiProperty({ enum: ['TEMPORARY', 'PERMANENT'], example: 'TEMPORARY' })
  @IsEnum(['TEMPORARY', 'PERMANENT'])
  type!: 'TEMPORARY' | 'PERMANENT';
}
