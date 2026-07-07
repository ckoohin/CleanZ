import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './config/database.config';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { TokenModule } from './modules/token/token.module';
import { UploadModule } from './modules/upload/upload.module';
import { AuthGoogleModule } from './modules/auth-google/auth-google.module';
import { AuthFacebookModule } from './modules/auth-facebook/auth-facebook.module';
import { TaskerModule } from './modules/tasker/tasker.module';
import { CustomerModule } from './modules/customer/customer.module';
import { BookingModule } from './modules/booking/booking.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { IncidentModule } from './modules/incident/incident.module';
import { SupportTicketModule } from './modules/support-ticket/support-ticket.module';
import { WithdrawalModule } from './modules/withdrawal/withdrawal.module';
import { AdminModule } from './modules/admin/admin.module';
import { PolicyModule } from './modules/policy/policy.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { QueueModule } from './modules/queue/queue.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ServicesModule } from './modules/service/services.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { FinanceModule } from './modules/finance/finance.module';
import { VoucherModule } from './modules/voucher/voucher.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { ReviewModule } from './modules/review/review.module';
import { AppealModule } from './modules/appeal/appeal.module';
import { BlogModule } from './modules/blog/blog.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],        
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    AuthModule,
    UsersModule,
    TokenModule,
    UploadModule,
    AuthGoogleModule,
    AuthFacebookModule,
    TaskerModule,
    CustomerModule,
    BookingModule,
    WalletModule,
    IncidentModule,
    SupportTicketModule,
    WithdrawalModule,
    AdminModule,
    PolicyModule,
    TrackingModule,
    QueueModule,
    NotificationModule,
    ServicesModule,
    PricingModule,
    VoucherModule,
    FinanceModule,
    WorkflowModule,
    ReviewModule,
    AppealModule,
    BlogModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
