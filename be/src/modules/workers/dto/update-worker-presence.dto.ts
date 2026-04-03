import { IsEnum } from 'class-validator';
import { WORKER_PRESENCE_STATUS } from 'src/common/enums/worker-presence-status.enum';

export class UpdateWorkerPresenceDto {
  @IsEnum(WORKER_PRESENCE_STATUS, {
    message: 'status phải là ONLINE hoặc OFFLINE',
  })
  status!: WORKER_PRESENCE_STATUS;
}
