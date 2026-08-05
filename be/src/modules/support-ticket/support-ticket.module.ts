import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { SupportTicketEntity } from './entity/support-ticket.entity';
import { TicketMessageEntity } from './entity/ticket-message.entity';
import { TicketAttachmentEntity } from './entity/ticket-attachment.entity';
import { TicketStatusLogEntity } from './entity/ticket-status-log.entity';
import { TicketResolutionEntity } from './entity/ticket-resolution.entity';
import { TicketSurveyEntity } from './entity/ticket-survey.entity';
import { TicketThreadReadEntity } from './entity/ticket-thread-read.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { NotificationModule } from 'src/modules/notification/notification.module';
import { UploadModule } from 'src/modules/upload/upload.module';
import { SystemConfigModule } from 'src/modules/system-config/system-config.module';
import { TicketController } from './ticket.controller';
import { TicketAdminController } from './ticket-admin.controller';
import { TicketService } from './services/ticket.service';
import { TicketAdminService } from './services/ticket-admin.service';
import { TicketCodeService } from './services/ticket-code.service';
import { TicketConfigService } from './services/ticket-config.service';
import { TicketResolutionService } from './services/ticket-resolution.service';
import { TicketSlaService } from './services/ticket-sla.service';
import { TicketSurveyService } from './services/ticket-survey.service';
import { TicketStatsService } from './services/ticket-stats.service';
import { TicketReportService } from './services/ticket-report.service';
import { AdminActivityModule } from 'src/modules/admin/admin-activity.module';
import { SupportTicketProcessor } from './support-ticket.processor';
import { TicketRealtimeService } from './realtime/ticket-realtime.service';
import { SupportChatGateway } from './realtime/support-chat.gateway';
import { MessageCryptoService } from './services/message-crypto.service';
import {
  RESOLUTION_EXECUTOR,
  NoopResolutionExecutor,
} from './services/resolution-executor';
import { SUPPORT_TICKET_QUEUE } from './support-ticket.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SupportTicketEntity,
      TicketMessageEntity,
      TicketAttachmentEntity,
      TicketStatusLogEntity,
      TicketResolutionEntity,
      TicketSurveyEntity,
      TicketThreadReadEntity,
      UserEntity,
      BookingEntity,
    ]),
    BullModule.registerQueue({ name: SUPPORT_TICKET_QUEUE }),
    NotificationModule,
    UploadModule,
    SystemConfigModule,
    AdminActivityModule,
  ],
  controllers: [TicketController, TicketAdminController],
  providers: [
    TicketService,
    TicketAdminService,
    TicketCodeService,
    TicketConfigService,
    TicketResolutionService,
    TicketSlaService,
    TicketSurveyService,
    TicketStatsService,
    TicketReportService,
    SupportTicketProcessor,
    TicketRealtimeService,
    SupportChatGateway,
    MessageCryptoService,
    { provide: RESOLUTION_EXECUTOR, useClass: NoopResolutionExecutor },
  ],
  exports: [TypeOrmModule, TicketService],
})
export class SupportTicketModule {}
