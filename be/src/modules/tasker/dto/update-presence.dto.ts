import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { TASKER_PRESENCE_STATUS } from 'src/common/enums/tasker-presence-status.enum';

export class UpdatePresenceDto {
  @ApiProperty({
    enum: TASKER_PRESENCE_STATUS,
    example: TASKER_PRESENCE_STATUS.ONLINE,
  })
  @IsEnum(TASKER_PRESENCE_STATUS)
  presenceStatus!: TASKER_PRESENCE_STATUS;
}
