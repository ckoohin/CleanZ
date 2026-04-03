import { WORKER_PRESENCE_STATUS } from 'src/common/enums/worker-presence-status.enum';

export class WorkerPresenceResponseDto {
  workerId!: string;
  status!: WORKER_PRESENCE_STATUS;
  isBusy!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
