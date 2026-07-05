import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingStatusLogEntity } from './entity/booking-status-log.entity';
import { BookingEntity } from './entity/booking.entity';
import { BookingSubServiceEntity } from './entity/booking-sub-service.entity';
import { BookingQuoteEntity } from './entity/booking-quote.entity';
import { BookingController } from './booking.controller';
import { CustomerBookingService } from './services/customer-booking.service';
import { TaskerBookingService } from './services/tasker-booking.service';
import { BookingLocationPolicyService } from './services/booking-location-policy.service';
import { BookingPolicyService } from './services/booking-policy.service';
import { BookingScheduleService } from './services/booking-schedule.service';
import { BookingExpirationService } from './services/booking-expiration.service';
import { CustomerAddressEntity } from '../customer/entity/customer-address.entity';
import { CustomerEntity } from '../customer/entity/customer.entity';
import { GoongMapModule } from '../goong/goong-map.module';
import { PaymentModule } from '../payment/payment.module';
import { PricingModule } from '../pricing/pricing.module';
import { SystemConfigModule } from '../system-config/system-config.module';
import { TrackingModule } from '../tracking/tracking.module';
import { VoucherModule } from '../voucher/voucher.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationModule } from '../notification/notification.module';
import { BookingDispatchService } from './services/booking-dispatch.service';
import { BookingDispatchProcessor } from './processors/booking-dispatch.processor';
import { BookingCheckinService } from './services/booking-checkin.service';
import { BookingCheckinProcessor } from './processors/booking-checkin.processor';
import { TaskerCreateBookingService } from './services/tasker-create-booking.service';
import { TaskerConfirmCustomerBookingService } from './services/tasker-confirm-customer-booking.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      BookingStatusLogEntity,
      CustomerAddressEntity,
      CustomerEntity,
      BookingSubServiceEntity,
      BookingQuoteEntity,
    ]),
    PaymentModule,
    PricingModule,
    GoongMapModule,
    SystemConfigModule,
    TrackingModule,
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
    BookingDispatchService,
    BookingDispatchProcessor,
    BookingCheckinService,
    BookingCheckinProcessor,
    TaskerCreateBookingService,
    TaskerConfirmCustomerBookingService,
  ],
  exports: [
    BookingLocationPolicyService,
    BookingPolicyService,
    BookingScheduleService,
  ],
})
export class BookingModule {}
