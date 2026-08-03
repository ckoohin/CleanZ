import { Injectable, ConflictException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { IncidentLogDimension } from 'src/common/enums/incident-log-dimension.enum';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { IncidentStatusLogEntity } from '../entity/incident-status-log.entity';

/**
 * Bảng chuyển trạng thái DUY NHẤT của sự cố. Mọi bước — kể cả thu hồi bồi thường —
 * đều phải khai báo ở đây; không nhánh nào được set `status` mà bỏ qua bảng này.
 */
export const STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  // Admin tiếp nhận, hoặc khách rút / hết hạn tiếp nhận.
  [IncidentStatus.REPORTED]: [IncidentStatus.REVIEWING, IncidentStatus.CLOSED],
  // Gửi Tasker phản biện, hoặc chốt thẳng (khi không bất lợi cho Tasker).
  [IncidentStatus.REVIEWING]: [
    IncidentStatus.AWAITING_RESPONSE,
    IncidentStatus.AWAITING_PAYOUT,
    IncidentStatus.REJECTED,
    IncidentStatus.CLOSED,
  ],
  // Admin sửa lại quyết định (quay về soạn) hoặc chốt sau khi hết cửa sổ / có phản hồi.
  [IncidentStatus.AWAITING_RESPONSE]: [
    IncidentStatus.REVIEWING,
    IncidentStatus.AWAITING_PAYOUT,
    IncidentStatus.REJECTED,
    IncidentStatus.CLOSED,
  ],
  // Chi trả, hoặc THU HỒI quyết định đã chốt khi chưa chi. Thu hồi trả hồ sơ về đúng
  // trạng thái trước lúc chốt: đã gửi Tasker thì về AWAITING_RESPONSE (phản hồi/hết hạn
  // của họ vẫn còn hiệu lực ở version đó), chưa gửi thì về REVIEWING.
  [IncidentStatus.AWAITING_PAYOUT]: [
    IncidentStatus.COMPENSATED,
    IncidentStatus.AWAITING_RESPONSE,
    IncidentStatus.REVIEWING,
  ],
  // Đóng nguội, hoặc đảo bồi thường → mở lại ở version quyết định mới.
  [IncidentStatus.COMPENSATED]: [
    IncidentStatus.CLOSED,
    IncidentStatus.REVIEWING,
  ],
  [IncidentStatus.REJECTED]: [IncidentStatus.CLOSED],
  [IncidentStatus.CLOSED]: [],
};

/** Quyết định đã chốt — không cho sửa nội dung quyết định nữa. */
export const FINALIZED_STATUSES: IncidentStatus[] = [
  IncidentStatus.AWAITING_PAYOUT,
  IncidentStatus.COMPENSATED,
  IncidentStatus.REJECTED,
];

/** Admin còn được soạn / sửa quyết định. */
export const EDITABLE_STATUSES: IncidentStatus[] = [
  IncidentStatus.REVIEWING,
  IncidentStatus.AWAITING_RESPONSE,
];

@Injectable()
export class IncidentStateService {
  assertStatusTransition(from: IncidentStatus, to: IncidentStatus): void {
    if (from === to) return;
    if (!STATUS_TRANSITIONS[from].includes(to)) {
      throw new ConflictException({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Không thể chuyển trạng thái sự cố từ ${from} sang ${to}`,
      });
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
