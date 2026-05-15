import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BookingEntity } from './entities/booking.entity';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { ServiceEntity } from '../services/entities/service.entity';
import { BookingAddonEntity } from './entities/booking-addon.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      CustomerEntity,
      ServiceEntity,
      BookingAddonEntity,
    ]),
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
