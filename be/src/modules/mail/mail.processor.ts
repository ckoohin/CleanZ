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
        this.logger.log(
          `[TempPassword] Processor nhận job | jobId=${job.id} email=${d.email} attemptsMade=${job.attemptsMade}`,
        );
        try {
          await this.mailService.sendTempPasswordEmail(
            d.email,
            d.fullName,
            d.tempPassword,
            d.loginUrl,
          );
          this.logger.log(
            `[TempPassword] Email gửi thành công | jobId=${job.id} email=${d.email}`,
          );
        } catch (err) {
          this.logger.error(
            `[TempPassword] Gửi email thất bại | jobId=${job.id} email=${d.email} attempt=${job.attemptsMade}`,
            err as Error,
          );
          throw err; // để BullMQ retry
        }
        break;
      }
      default:
        this.logger.warn(`Bỏ qua mail job không xác định: ${job.name}`);
    }
  }
}
