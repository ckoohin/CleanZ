import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class UpdateTaskerLocationDto {
  @ApiProperty({ example: 10.7769, description: 'Vĩ độ hiện tại của tasker' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({
    example: 106.7009,
    description: 'Kinh độ hiện tại của tasker',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}
