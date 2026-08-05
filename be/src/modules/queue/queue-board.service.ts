import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

@Injectable()
export class QueueBoardService implements OnModuleInit {
  constructor(
    @InjectQueue('bookingQueue') private bookingQueue: Queue,
    @InjectQueue('notificationQueue') private notificationQueue: Queue,
    @InjectQueue('paymentQueue') private paymentQueue: Queue,
    @InjectQueue('analyticsQueue') private analyticsQueue: Queue,
    @InjectQueue('earningsReportQueue') private earningsReportQueue: Queue,
  ) {}

  onModuleInit() {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    createBullBoard({
      queues: [
        new BullMQAdapter(this.bookingQueue),
        new BullMQAdapter(this.notificationQueue),
        new BullMQAdapter(this.paymentQueue),
        new BullMQAdapter(this.analyticsQueue),
        new BullMQAdapter(this.earningsReportQueue),
      ],
      serverAdapter: serverAdapter,
    });
  }
}
