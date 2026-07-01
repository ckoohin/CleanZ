import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  BOOKING_CHECKIN_QUEUE,
  BookingCheckinService,
  CHECKIN_JOB,
  CheckinJobData,
} from '../services/booking-checkin.service';

@Processor(BOOKING_CHECKIN_QUEUE)
export class BookingCheckinProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingCheckinProcessor.name);

  constructor(private readonly checkinService: BookingCheckinService) {
    super();
  }

  async process(job: Job<CheckinJobData>): Promise<void> {
    const { bookingId } = job.data;

    try {
      switch (job.name) {
        case CHECKIN_JOB.REMIND:
          await this.checkinService.handleRemind(bookingId);
          break;
        case CHECKIN_JOB.LATE_WARNING:
          await this.checkinService.handleLateWarning(bookingId);
          break;
        case CHECKIN_JOB.AUTO_CANCEL:
          await this.checkinService.handleAutoCancel(bookingId);
          break;
        case CHECKIN_JOB.AUTO_CHECKOUT:
          await this.checkinService.handleAutoCheckout(bookingId);
          break;
        default:
          this.logger.warn(`Job không xác định: ${job.name}`);
      }
    } catch (err) {
      this.logger.error(
        `Lỗi xử lý job ${job.name} (booking=${bookingId}): ${err}`,
      );
      throw err;
    }
  }
}
