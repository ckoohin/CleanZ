import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  MAIL_JOB_OPTS,
  MAIL_JOB_TEMP_PASSWORD,
  MAIL_QUEUE,
  TempPasswordJobData,
} from './mail.constants';

/**
 * Enqueue email để gửi nền — gọi SAU khi commit DB, không giữ transaction/SMTP
 * trong request. Nếu enqueue lỗi (Redis down) chỉ log, không làm hỏng nghiệp vụ.
 */
@Injectable()
export class MailQueueService {
  private readonly logger = new Logger(MailQueueService.name);

  constructor(@InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue) {}

  async enqueueTempPassword(data: TempPasswordJobData): Promise<void> {
    this.logger.log(`[TempPassword] Đang enqueue job cho email=${data.email}`);
    try {
      const job = await this.mailQueue.add(
        MAIL_JOB_TEMP_PASSWORD,
        data,
        MAIL_JOB_OPTS,
      );
      this.logger.log(
        `[TempPassword] Job added to mailQueue | jobId=${job.id} email=${data.email}`,
      );
    } catch (err) {
      this.logger.error(
        `[TempPassword] Không enqueue được job cho email=${data.email}`,
        err as Error,
      );
    }
  }
}
