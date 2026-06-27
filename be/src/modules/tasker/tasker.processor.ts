import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TaskerService } from './tasker.service';
import {
  AutoUnbanJobData,
  TASKER_JOB_AUTO_UNBAN,
  TASKER_QUEUE,
} from './tasker.constants';

/** Xử lý job nền của tasker — hiện tại: tự mở khóa khi hết hạn ban. */
@Processor(TASKER_QUEUE)
export class TaskerProcessor extends WorkerHost {
  private readonly logger = new Logger(TaskerProcessor.name);

  constructor(private readonly taskerService: TaskerService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === TASKER_JOB_AUTO_UNBAN) {
      const d = job.data as AutoUnbanJobData;
      const unbanned = await this.taskerService.autoUnbanIfExpired(
        d.taskerId,
        d.expectedBanEndsAt,
      );
      if (unbanned) {
        this.logger.log(`Tự mở khóa tasker ${d.taskerId} (hết hạn ban)`);
      }
    }
  }
}
