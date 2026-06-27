import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewEntity } from './entity/review.entity';
import { ReviewReportEntity } from './entity/review-report.entity';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { ReviewAdminController } from './review-admin.controller';
import { ReviewTaskerController } from './review-tasker.controller';
import { BookingEntity } from '../booking/entity/booking.entity';
import { TaskerEntity } from '../tasker/entity/tasker.entity';
import { CustomerEntity } from '../customer/entity/customer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReviewEntity,
      ReviewReportEntity,
      BookingEntity,
      TaskerEntity,
      CustomerEntity,
    ]),
  ],
  controllers: [
    ReviewController,
    ReviewAdminController,
    ReviewTaskerController,
  ],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
