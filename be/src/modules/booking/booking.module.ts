import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingStatusLogEntity } from './entity/booking-status-log.entity';
import { BookingEntity } from './entity/booking.entity';
import { BookingController } from './booking.controller';
import { CustomerBookingService } from './services/customer-booking.service';
import { TaskerBookingService } from './services/tasker-booking.service';
import { BookingLocationPolicyService } from './services/booking-location-policy.service';
import { BookingPolicyService } from './services/booking-policy.service';
import { BookingScheduleService } from './services/booking-schedule.service';
import { BookingExpirationService } from './services/booking-expiration.service';
import { CustomerAddressEntity } from '../customer/entity/customer-address.entity';
import { CustomerEntity } from '../customer/entity/customer.entity';
import { PaymentModule } from '../payment/payment.module';
import { PricingModule } from '../pricing/pricing.module';
import { SystemConfigModule } from '../system-config/system-config.module';
import { VoucherModule } from '../voucher/voucher.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      BookingStatusLogEntity,
      CustomerAddressEntity,
      CustomerEntity,
    ]),
    PaymentModule,
    PricingModule,
    SystemConfigModule,
    VoucherModule,
    WalletModule,
    NotificationModule,
  ],
  controllers: [BookingController],
  providers: [
    BookingLocationPolicyService,
    BookingPolicyService,
    BookingScheduleService,
    BookingExpirationService,
    CustomerBookingService,
    TaskerBookingService,
  ],
})
export class BookingModule {}
