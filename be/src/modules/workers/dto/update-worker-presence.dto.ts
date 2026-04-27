import { IsEnum } from 'class-validator';
import { WORKER_PRESENCE_STATUS } from 'src/common/enums/worker-presence-status.enum';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateWorkerPresenceDto {
  @ApiProperty({
    enum: WORKER_PRESENCE_STATUS,
    example: WORKER_PRESENCE_STATUS.ONLINE,
    description: 'Trạng thái hiện diện của worker',
  })
  @IsEnum(WORKER_PRESENCE_STATUS, {
    message: 'status phải là ONLINE hoặc OFFLINE',
  })
  status!: WORKER_PRESENCE_STATUS;
}
