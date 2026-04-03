import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { BookingEntity } from './entities/booking.entity';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { WorkerServiceEntity } from '../workers/entities/worker-service.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      CustomerEntity,
      WorkerServiceEntity,
    ]),
    MailModule,
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
