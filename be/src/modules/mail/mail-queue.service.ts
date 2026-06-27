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
    try {
      await this.mailQueue.add(MAIL_JOB_TEMP_PASSWORD, data, MAIL_JOB_OPTS);
    } catch (err) {
      this.logger.error(
        `Không enqueue được temp-password email cho ${data.email}`,
        err as Error,
      );
    }
  }
}
