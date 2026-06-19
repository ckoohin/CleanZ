import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IncidentEntity } from './entity/incident.entity';
import { IncidentDamageItemEntity } from './entity/incident-damage-item.entity';
import { IncidentEvidenceEntity } from './entity/incident-evidence.entity';
import { IncidentStatementEntity } from './entity/incident-statement.entity';
import { IncidentStatusLogEntity } from './entity/incident-status-log.entity';
import { CustomerIncidentStrikeEntity } from './entity/customer-incident-strike.entity';
import { BookingEntity } from '../booking/entity/booking.entity';
import { SupportTicketEntity } from '../support-ticket/entity/support-ticket.entity';
import { UploadModule } from '../upload/upload.module';
import { SystemConfigModule } from '../system-config/system-config.module';
import { NotificationModule } from '../notification/notification.module';
import { IncidentController } from './incident.controller';
import { IncidentAdminController } from './incident-admin.controller';
import { IncidentTaskerController } from './incident-tasker.controller';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IncidentEntity,
      IncidentDamageItemEntity,
      IncidentEvidenceEntity,
      IncidentStatementEntity,
      IncidentStatusLogEntity,
      CustomerIncidentStrikeEntity,
      BookingEntity,
      SupportTicketEntity,
    ]),
    UploadModule,
    SystemConfigModule,
    NotificationModule,
  ],
  controllers: [
    IncidentController,
    IncidentAdminController,
    IncidentTaskerController,
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
  ],
  exports: [TypeOrmModule],
})
export class IncidentModule {}
