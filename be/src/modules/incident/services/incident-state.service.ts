import { Injectable, ConflictException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { IncidentCompensationStatus } from 'src/common/enums/incident-compensation-status.enum';
import { IncidentLogDimension } from 'src/common/enums/incident-log-dimension.enum';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { IncidentStatusLogEntity } from '../entity/incident-status-log.entity';

export const STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  [IncidentStatus.REPORTED]: [
    IncidentStatus.INVESTIGATING,
    IncidentStatus.CLOSED,
  ],
  [IncidentStatus.INVESTIGATING]: [
    IncidentStatus.APPROVED,
    IncidentStatus.REJECTED,
    IncidentStatus.CLOSED,
  ],
  [IncidentStatus.APPROVED]: [IncidentStatus.COMPENSATED],
  [IncidentStatus.REJECTED]: [IncidentStatus.CLOSED],
  [IncidentStatus.COMPENSATED]: [IncidentStatus.CLOSED],
  [IncidentStatus.CLOSED]: [],
};

export const COMP_TRANSITIONS: Record<
  IncidentCompensationStatus,
  IncidentCompensationStatus[]
> = {
  [IncidentCompensationStatus.NONE]: [IncidentCompensationStatus.PENDING],
  [IncidentCompensationStatus.PENDING]: [IncidentCompensationStatus.PROCESSING],
  [IncidentCompensationStatus.PROCESSING]: [
    IncidentCompensationStatus.RECORDED,
    IncidentCompensationStatus.FAILED,
  ],
  [IncidentCompensationStatus.FAILED]: [IncidentCompensationStatus.PROCESSING],
  [IncidentCompensationStatus.RECORDED]: [],
};

@Injectable()
export class IncidentStateService {
  assertStatusTransition(from: IncidentStatus, to: IncidentStatus): void {
    if (!STATUS_TRANSITIONS[from].includes(to)) {
      throw new ConflictException(
        `Không thể chuyển trạng thái sự cố từ ${from} sang ${to}`,
      );
    }
  }

  assertCompensationTransition(
    from: IncidentCompensationStatus,
    to: IncidentCompensationStatus,
  ): void {
    if (!COMP_TRANSITIONS[from].includes(to)) {
      throw new ConflictException(
        `Không thể chuyển trạng thái xử lý tiền từ ${from} sang ${to}`,
      );
    }
  }

  async log(
    manager: EntityManager,
    incidentId: string,
    dimension: IncidentLogDimension,
    oldValue: string | null,
    newValue: string,
    changedByUserId: string | null,
    reason?: string | null,
  ): Promise<void> {
    const repo = manager.getRepository(IncidentStatusLogEntity);
    await repo.save(
      repo.create({
        incident: { id: incidentId },
        dimension,
        oldValue,
        newValue,
        changedBy: changedByUserId
          ? ({ id: changedByUserId } as UserEntity)
          : null,
        reason: reason ?? null,
      }),
    );
  }
}
