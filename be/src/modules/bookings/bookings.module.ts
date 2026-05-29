import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsService } from './bookings.service';
import { CustomerBookingService } from './customer-booking.service';
import { StaffBookingService } from './staff-booking.service';
import { BookingsController } from './bookings.controller';
import { BookingEntity } from './entities/booking.entity';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { ServiceEntity } from '../services/entities/service.entity';
import { BookingAddonEntity } from './entities/booking-addon.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { StaffServiceEntity } from '../staff/entities/staff-service.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      CustomerEntity,
      ServiceEntity,
      BookingAddonEntity,
      StaffEntity,
      StaffServiceEntity,
    ]),
  ],
  controllers: [BookingsController],
  providers: [BookingsService, CustomerBookingService, StaffBookingService],
})
export class BookingsModule {}
