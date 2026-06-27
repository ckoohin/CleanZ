import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService } from './mail.service';
import {
  MAIL_JOB_TEMP_PASSWORD,
  MAIL_QUEUE,
  TempPasswordJobData,
} from './mail.constants';

/**
 * Xử lý gửi email nền (ngoài request/transaction). Dispatch theo job name.
 * Lỗi gửi sẽ được BullMQ retry theo MAIL_JOB_OPTS (exponential backoff).
 */
@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case MAIL_JOB_TEMP_PASSWORD: {
        const d = job.data as TempPasswordJobData;
        await this.mailService.sendTempPasswordEmail(
          d.email,
          d.fullName,
          d.tempPassword,
          d.loginUrl,
        );
        this.logger.log(`Đã gửi temp-password email tới ${d.email}`);
        break;
      }
      default:
        this.logger.warn(`Bỏ qua mail job không xác định: ${job.name}`);
    }
  }
}
