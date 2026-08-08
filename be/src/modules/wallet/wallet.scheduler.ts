import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  WALLET_JOB_EXPIRE_STALE_TOPUPS,
  WALLET_QUEUE,
} from './wallet.constants';

@Injectable()
export class WalletScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(WalletScheduler.name);

  constructor(@InjectQueue(WALLET_QUEUE) private readonly walletQueue: Queue) {}

  async onApplicationBootstrap(): Promise<void> {
    // Chạy mỗi 10 phút — mark đơn nạp stale thành EXPIRED và cancel PayOS link.
    await this.walletQueue.add(
      WALLET_JOB_EXPIRE_STALE_TOPUPS,
      {},
      {
        repeat: { every: 10 * 60 * 1000 },
        removeOnComplete: 10,
        removeOnFail: 50,
        jobId: 'expire-stale-topups-repeatable',
      },
    );
    this.logger.log('Scheduled expire-stale-topups job (every 10 min)');
  }
}
