import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import { EarningsReportDeliveryStatus } from 'src/common/enums/earnings-report-delivery-status.enum';
import { parseLocalAnchor } from 'src/common/helpers/earnings-period.helper';
import { formatVnd } from 'src/common/helpers/number.helper';
import { MailService } from 'src/modules/mail/mail.service';
import {
  EARNINGS_REPORT_JOB_SEND,
  EARNINGS_REPORT_QUEUE,
  PERIOD_FILE_LABEL,
  type EarningsReportJobData,
} from './earnings-report.constants';
import { EarningsReportDeliveryEntity } from './entity/earnings-report-delivery.entity';
import { EarningsReportDataService } from './services/earnings-report-data.service';
import { EarningsReportDispatchService } from './services/earnings-report-dispatch.service';
import { EarningsReportPdfService } from './services/earnings-report-pdf.service';

const PERIOD_EMAIL_LABEL: Record<string, string> = {
  week: 'tuần',
  month: 'tháng',
  year: 'năm',
};

/** Cắt lỗi trước khi ghi DB — theo mẫu notification outbox. */
const MAX_ERROR_LENGTH = 2000;

/**
 * Sinh PDF rồi gửi email cho một Tasker.
 *
 * PDF được dựng tại đây chứ không nhét vào job data: Buffer vài trăm KB mỗi đơn
 * sẽ phình Redis. Lỗi được ném lại để BullMQ retry theo `EARNINGS_REPORT_JOB_OPTS`.
 */
@Processor(EARNINGS_REPORT_QUEUE)
export class EarningsReportProcessor extends WorkerHost {
  private readonly logger = new Logger(EarningsReportProcessor.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly dataService: EarningsReportDataService,
    private readonly pdfService: EarningsReportPdfService,
    private readonly mailService: MailService,
    private readonly dispatchService: EarningsReportDispatchService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== EARNINGS_REPORT_JOB_SEND) return;

    const data = job.data as EarningsReportJobData;
    const deliveryRepo = this.dataSource.getRepository(
      EarningsReportDeliveryEntity,
    );
    const delivery = await deliveryRepo.findOne({
      where: { runId: data.runId, taskerId: data.taskerId },
    });

    if (!delivery) {
      this.logger.warn(
        `Không tìm thấy delivery cho run=${data.runId} tasker=${data.taskerId} — bỏ qua.`,
      );
      return;
    }

    // Idempotent: job retry sau khi đã gửi thành công thì không gửi lại.
    if (delivery.status === EarningsReportDeliveryStatus.SENT) return;

    try {
      const report = await this.dataService.build(
        data.taskerId,
        data.period,
        parseLocalAnchor(data.periodStartKey, Date.now()),
      );

      const pdf = await this.pdfService.buildPdf(report);

      await this.mailService.sendTaskerEarningsReportEmail(
        delivery.email,
        report.tasker.fullName,
        {
          rangeLabel: report.period.rangeLabel,
          periodLabel: PERIOD_EMAIL_LABEL[data.period] ?? data.period,
          netIncome: formatVnd(report.summary.netIncome),
          grossRevenue: formatVnd(report.summary.grossRevenue),
          platformFee: formatVnd(report.summary.platformFee),
          completedBookings: report.summary.completedBookings,
          generatedAt: report.generatedAt.toLocaleDateString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
          }),
        },
        {
          filename: this.pdfService.buildFileName(
            PERIOD_FILE_LABEL[data.period],
            data.periodStartKey,
          ),
          content: pdf,
        },
      );

      await deliveryRepo.update(delivery.id, {
        status: EarningsReportDeliveryStatus.SENT,
        sentAt: new Date(),
        lastError: null,
        grossRevenue: report.summary.grossRevenue,
        platformFee: report.summary.platformFee,
        netIncome: report.summary.netIncome,
        completedBookings: report.summary.completedBookings,
      });

      this.logger.log(
        `Đã gửi bảng kê ${data.period}/${data.periodStartKey} cho tasker=${data.taskerId}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Chỉ đánh FAILED ở lần thử cuối; các lần trước còn cơ hội retry.
      const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);

      await deliveryRepo.update(delivery.id, {
        status: isFinalAttempt
          ? EarningsReportDeliveryStatus.FAILED
          : EarningsReportDeliveryStatus.PENDING,
        lastError: message.slice(0, MAX_ERROR_LENGTH),
      });

      this.logger.error(
        `Gửi bảng kê thất bại run=${data.runId} tasker=${data.taskerId} attempt=${job.attemptsMade + 1}: ${message}`,
      );
      throw err; // để BullMQ retry
    } finally {
      await this.dispatchService.refreshRunProgress(data.runId);
    }
  }
}
