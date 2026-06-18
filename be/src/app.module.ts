import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { QueueModule } from './modules/queue/queue.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ServicesModule } from './modules/service/services.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { VouchersModule } from './modules/voucher/vouchers.module';
import { FinanceModule } from './modules/finance/finance.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
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
    QueueModule,
    NotificationModule,
    ServicesModule,
    PricingModule,
    VouchersModule,
    FinanceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
