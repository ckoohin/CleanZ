import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminDashboardRepository } from './repositories/admin-dashboard.repository';
import { AdminCustomerRepository } from './repositories/admin-customer.repository';
import { AdminBookingRepository } from './repositories/admin-booking.repository';
import { AdminDashboardReportService } from './services/admin-dashboard-report.service';
import { UsersModule } from 'src/modules/users/users.module';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { IncidentEntity } from 'src/modules/incident/entity/incident.entity';
import { SupportTicketEntity } from 'src/modules/support-ticket/entity/support-ticket.entity';
import { ReviewEntity } from 'src/modules/review/entity/review.entity';
import { TaskerLevelEntity } from 'src/modules/tasker/entity/tasker-level.entity';
import { VoucherEntity } from 'src/modules/voucher/entity/voucher.entity';
import { PricingModule } from 'src/modules/pricing/pricing.module';
import { WalletModule } from 'src/modules/wallet/wallet.module';
import { NotificationModule } from 'src/modules/notification/notification.module';
import { PaymentModule } from 'src/modules/payment/payment.module';
import { BookingModule } from 'src/modules/booking/booking.module';
import { NotificationEntity } from 'src/modules/notification/entity/notification.entity';
import { BookingStatusLogEntity } from 'src/modules/booking/entity/booking-status-log.entity';
import { MailModule } from 'src/modules/mail/mail.module';
import { VoucherModule } from 'src/modules/voucher/voucher.module';
import { User } from 'src/modules/users/entities/user.entity';
import { AdminActivityLogEntity } from './entities/admin-activity-log.entity';
import { AdminActivityInterceptor } from './interceptors/admin-activity.interceptor';
import { AdminActivitySnapshotService } from './services/admin-activity-snapshot.service';
import { IncidentModule } from 'src/modules/incident/incident.module';
import { AdminActivityModule } from './admin-activity.module';
import { QuizModule } from 'src/modules/quiz/quiz.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      CustomerEntity,
      TaskerEntity,
      IncidentEntity,
      SupportTicketEntity,
      ReviewEntity,
      TaskerLevelEntity,
      VoucherEntity,
      NotificationEntity,
      BookingStatusLogEntity,
      AdminActivityLogEntity,
      User,
    ]),
    UsersModule,
    PricingModule,
    WalletModule,
    NotificationModule,
    PaymentModule,
    BookingModule,
    MailModule,
    VoucherModule,
    IncidentModule,
    AdminActivityModule,
    QuizModule,
  ],

  controllers: [AdminController],
  providers: [
    AdminDashboardRepository,
    AdminCustomerRepository,
    AdminBookingRepository,
    AdminDashboardReportService,
    AdminActivitySnapshotService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AdminActivityInterceptor,
    },
  ],
})
export class AdminModule {}
