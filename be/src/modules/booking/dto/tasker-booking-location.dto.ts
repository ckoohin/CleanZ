import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class TaskerBookingLocationDto {
  @ApiProperty({
    example: 21.0277644,
    description: 'Vĩ độ hiện tại của tasker',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  currentLatitude!: number;

  @ApiProperty({
    example: 105.8341598,
    description: 'Kinh độ hiện tại của tasker',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  currentLongitude!: number;
}

export class OptionalTaskerBookingLocationDto {
  @ApiProperty({
    example: 21.0277644,
    description: 'Vĩ độ hiện tại của tasker',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  currentLatitude?: number;

  @ApiProperty({
    example: 105.8341598,
    description: 'Kinh độ hiện tại của tasker',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  currentLongitude?: number;
}
