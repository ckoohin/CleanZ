import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AdminCheckinOverrideDto {
  @ApiProperty({
    example:
      'Customer xác nhận Tasker đã có mặt nhưng thiết bị không lấy được GPS',
    minLength: 5,
    maxLength: 1000,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}
