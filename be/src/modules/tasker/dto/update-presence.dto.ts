import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { TASKER_PRESENCE_STATUS } from 'src/common/enums/tasker-presence-status.enum';

export class UpdatePresenceDto {
  @ApiProperty({
    enum: TASKER_PRESENCE_STATUS,
    example: TASKER_PRESENCE_STATUS.ONLINE,
  })
  @IsEnum(TASKER_PRESENCE_STATUS)
  presenceStatus!: TASKER_PRESENCE_STATUS;

  @ApiPropertyOptional({
    example: 10.7769,
    description: 'Vĩ độ (khi chuyển sang ONLINE)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({
    example: 106.7009,
    description: 'Kinh độ (khi chuyển sang ONLINE)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
}
