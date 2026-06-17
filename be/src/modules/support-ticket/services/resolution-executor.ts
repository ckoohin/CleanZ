import { Injectable, Logger } from '@nestjs/common';
import { TicketResolutionEntity } from '../entity/ticket-resolution.entity';

export const RESOLUTION_EXECUTOR = 'RESOLUTION_EXECUTOR';

export interface ResolutionExecutionResult {
  walletTransactionId?: string;
}

export interface ResolutionExecutor {
  execute(
    resolution: TicketResolutionEntity,
  ): Promise<ResolutionExecutionResult>;
}

@Injectable()
export class NoopResolutionExecutor implements ResolutionExecutor {
  private readonly logger = new Logger(NoopResolutionExecutor.name);

  execute(
    resolution: TicketResolutionEntity,
  ): Promise<ResolutionExecutionResult> {
    this.logger.log(
      `[record-only] resolution ${resolution.id} type=${resolution.type} amount=${resolution.amount ?? '-'} — chưa thực thi dòng tiền (Phase 2)`,
    );
    return Promise.resolve({});
  }
}
