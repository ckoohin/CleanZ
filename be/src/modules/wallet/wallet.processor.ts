import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  TOPUP_EXPIRE_AFTER_MINUTES,
  WALLET_JOB_EXPIRE_STALE_TOPUPS,
  WALLET_QUEUE,
} from './wallet.constants';
import { WalletTopupService } from './wallet-topup.service';

@Processor(WALLET_QUEUE)
export class WalletProcessor extends WorkerHost {
  private readonly logger = new Logger(WalletProcessor.name);

  constructor(private readonly walletTopupService: WalletTopupService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === WALLET_JOB_EXPIRE_STALE_TOPUPS) {
      const count = await this.walletTopupService.expireStaleTopups(
        TOPUP_EXPIRE_AFTER_MINUTES,
      );
      if (count > 0) {
        this.logger.log(`Expired ${count} stale topup orders`);
      }
    }
  }
}
