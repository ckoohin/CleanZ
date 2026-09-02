import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IncidentEntity } from './entity/incident.entity';
import { IncidentDamageItemEntity } from './entity/incident-damage-item.entity';
import { IncidentDecisionResponseEntity } from './entity/incident-decision-response.entity';
import { IncidentEvidenceEntity } from './entity/incident-evidence.entity';
import { IncidentStatementEntity } from './entity/incident-statement.entity';
import { IncidentStatusLogEntity } from './entity/incident-status-log.entity';
import { NotificationOutboxEntity } from './entity/notification-outbox.entity';
import { BankStatementEntryEntity } from './entity/bank-statement-entry.entity';
import { CustomerIncidentStrikeEntity } from './entity/customer-incident-strike.entity';
import { BookingEntity } from '../booking/entity/booking.entity';
import { SupportTicketEntity } from '../support-ticket/entity/support-ticket.entity';
import { UploadModule } from '../upload/upload.module';
import { SystemConfigModule } from '../system-config/system-config.module';
import { NotificationModule } from '../notification/notification.module';
import { WalletModule } from '../wallet/wallet.module';
import { IncidentController } from './incident.controller';
import { IncidentAdminController } from './incident-admin.controller';
import { IncidentTaskerController } from './incident-tasker.controller';
import { BankStatementController } from './bank-statement.controller';
import { IncidentService } from './services/incident.service';
import { IncidentAdminService } from './services/incident-admin.service';
import { IncidentDecisionService } from './services/incident-decision.service';
import { CompensationExecutorService } from './services/compensation-executor.service';
import { IncidentTaskerService } from './services/incident-tasker.service';
import { IncidentCodeService } from './services/incident-code.service';
import { IncidentConfigService } from './services/incident-config.service';
import { IncidentStateService } from './services/incident-state.service';
import { FraudStrikeService } from './services/fraud-strike.service';
import { IncidentNotifier } from './services/incident-notifier.service';
import { IncidentAutomationService } from './services/incident-automation.service';
import { IncidentNotificationOutboxWorkerService } from './services/incident-notification-outbox-worker.service';
import { IncidentEvidenceLifecycleService } from './services/incident-evidence-lifecycle.service';
import { IncidentDepositHoldService } from './services/incident-deposit-hold.service';
import { IncidentReconciliationService } from './services/incident-reconciliation.service';
import { BankStatementService } from './services/bank-statement.service';
import { AlertModule } from '../alert/alert.module';
import { IncidentReportService } from './services/incident-report.service';
import { AdminActivityModule } from 'src/modules/admin/admin-activity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IncidentEntity,
      IncidentDamageItemEntity,
      IncidentDecisionResponseEntity,
      IncidentEvidenceEntity,
      IncidentStatementEntity,
      IncidentStatusLogEntity,
      NotificationOutboxEntity,
      BankStatementEntryEntity,
      CustomerIncidentStrikeEntity,
      BookingEntity,
      SupportTicketEntity,
    ]),
    UploadModule,
    SystemConfigModule,
    NotificationModule,
    WalletModule,
    AdminActivityModule,
    AlertModule,
  ],
  controllers: [
    IncidentController,
    IncidentAdminController,
    IncidentTaskerController,
    BankStatementController,
  ],
  providers: [
    IncidentService,
    IncidentAdminService,
    IncidentDecisionService,
    CompensationExecutorService,
    IncidentTaskerService,
    IncidentCodeService,
    IncidentConfigService,
    IncidentStateService,
    FraudStrikeService,
    IncidentNotifier,
    IncidentAutomationService,
    IncidentNotificationOutboxWorkerService,
    IncidentEvidenceLifecycleService,
    IncidentDepositHoldService,
    IncidentReconciliationService,
    BankStatementService,
    // `IncidentAlertService` giờ do `AlertModule` cung cấp — giữ đúng một instance
    // để bộ throttle theo key không bị tách đôi.
    IncidentReportService,
  ],
  exports: [TypeOrmModule, IncidentAdminService],
})
export class IncidentModule {}
