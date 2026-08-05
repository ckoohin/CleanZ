import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module';
import { TaskerModule } from '../tasker/tasker.module';
import { EarningsReportAdminController } from './earnings-report-admin.controller';
import { EARNINGS_REPORT_QUEUE } from './earnings-report.constants';
import { EarningsReportProcessor } from './earnings-report.processor';
import { EarningsReportScheduler } from './earnings-report.scheduler';
import { EarningsReportDeliveryEntity } from './entity/earnings-report-delivery.entity';
import { EarningsReportRunEntity } from './entity/earnings-report-run.entity';
import { EarningsReportAdminService } from './services/earnings-report-admin.service';
import { EarningsReportDataService } from './services/earnings-report-data.service';
import { EarningsReportDispatchService } from './services/earnings-report-dispatch.service';
import { EarningsReportPdfService } from './services/earnings-report-pdf.service';

/**
 * Bảng kê thu nhập Tasker gửi định kỳ qua email (PDF đính kèm).
 *
 * Dùng queue riêng `earningsReportQueue` thay vì `mailQueue`: processor cần
 * `EarningsReportDataService` + `PdfService`, đặt trong MailModule sẽ tạo phụ
 * thuộc vòng giữa hai module.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      EarningsReportRunEntity,
      EarningsReportDeliveryEntity,
    ]),
    BullModule.registerQueue({ name: EARNINGS_REPORT_QUEUE }),
    MailModule,
    TaskerModule,
  ],
  controllers: [EarningsReportAdminController],
  providers: [
    EarningsReportAdminService,
    EarningsReportDataService,
    EarningsReportDispatchService,
    EarningsReportPdfService,
    EarningsReportProcessor,
    EarningsReportScheduler,
  ],
})
export class EarningsReportModule {}
