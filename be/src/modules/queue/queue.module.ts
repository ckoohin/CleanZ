import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueBoardService } from './queue-board.service';

@Module({
  imports: [
    // Đăng ký các queue theo kế hoạch
    BullModule.registerQueue(
      { name: 'bookingQueue' },
      { name: 'notificationQueue' },
      { name: 'paymentQueue' },
      { name: 'analyticsQueue' },
    ),
  ],
  providers: [QueueBoardService],
  exports: [BullModule],
})
export class QueueModule {}
