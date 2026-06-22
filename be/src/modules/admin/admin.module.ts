import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminDashboardRepository } from './repositories/admin-dashboard.repository';
import { AdminCustomerRepository } from './repositories/admin-customer.repository';
import { AdminBookingRepository } from './repositories/admin-booking.repository';
import { UsersModule } from 'src/modules/users/users.module';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { IncidentEntity } from 'src/modules/incident/entity/incident.entity';
import { SupportTicketEntity } from 'src/modules/support-ticket/entity/support-ticket.entity';
import { WithdrawalEntity } from 'src/modules/withdrawal/entity/withdrawal.entity';
import { ReviewEntity } from 'src/modules/review/entity/review.entity';
import { TaskerLevelEntity } from 'src/modules/tasker/entity/tasker-level.entity';
import { VoucherEntity } from 'src/modules/voucher/entity/voucher.entity';
import { PricingModule } from 'src/modules/pricing/pricing.module';
import { WalletModule } from 'src/modules/wallet/wallet.module';
import { NotificationModule } from 'src/modules/notification/notification.module';
import { PaymentModule } from 'src/modules/payment/payment.module';
import { BookingModule } from 'src/modules/booking/booking.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      CustomerEntity,
      TaskerEntity,
      IncidentEntity,
      SupportTicketEntity,
      WithdrawalEntity,
      ReviewEntity,
      TaskerLevelEntity,
      VoucherEntity,
    ]),
    UsersModule,
    PricingModule,
    WalletModule,
    NotificationModule,
    PaymentModule,
    BookingModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminDashboardRepository,
    AdminCustomerRepository,
    AdminBookingRepository,
  ],
})
export class AdminModule {}
