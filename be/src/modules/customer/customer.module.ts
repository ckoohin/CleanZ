import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerAddressEntity } from './entity/customer-address.entity';
import { CustomerEntity } from './entity/customer.entity';
import { CustomerFavoriteTaskerEntity } from './entity/customer-favorite-tasker.entity';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { FavoriteTaskerController } from './favorite-tasker.controller';
import { FavoriteTaskerService } from './services/favorite-tasker.service';
import { UploadModule } from '../upload/upload.module';
import { TaskerScheduleAvailabilityService } from '../booking/services/tasker-schedule-availability.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerEntity,
      CustomerAddressEntity,
      CustomerFavoriteTaskerEntity,
    ]),
    UploadModule,
  ],
  controllers: [CustomerController, FavoriteTaskerController],
  providers: [
    CustomerService,
    FavoriteTaskerService,
    TaskerScheduleAvailabilityService,
  ],
  exports: [TypeOrmModule, CustomerService],
})
export class CustomerModule {}
