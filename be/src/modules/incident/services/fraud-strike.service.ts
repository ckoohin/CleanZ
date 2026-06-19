import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { CustomerIncidentStrikeEntity } from '../entity/customer-incident-strike.entity';
import { IncidentConfigService } from './incident-config.service';

const LOCK_UNTIL = new Date('2999-12-31T00:00:00Z');

@Injectable()
export class FraudStrikeService {
  constructor(private readonly config: IncidentConfigService) {}

  async addStrike(
    manager: EntityManager,
    customerId: string,
    incidentId: string,
    reason: string,
  ): Promise<{ strikes: number; locked: boolean }> {
    const repo = manager.getRepository(CustomerIncidentStrikeEntity);
    await repo.save(
      repo.create({
        customer: { id: customerId },
        incident: { id: incidentId },
        reason,
      }),
    );
    const strikes = await repo.count({
      where: { customer: { id: customerId } },
    });
    const { lockFrom } = await this.config.getStrikePolicy();
    let locked = false;
    if (strikes >= lockFrom) {
      await manager
        .getRepository(CustomerEntity)
        .update({ id: customerId }, { reportingLockedUntil: LOCK_UNTIL });
      locked = true;
    }
    return { strikes, locked };
  }

  async unlockReporter(
    manager: EntityManager,
    customerId: string,
  ): Promise<void> {
    await manager
      .getRepository(CustomerEntity)
      .update({ id: customerId }, { reportingLockedUntil: null });
  }
}
