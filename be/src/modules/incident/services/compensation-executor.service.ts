import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { toNumber } from 'src/common/helpers/number.helper';
import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { IncidentCompensationStatus } from 'src/common/enums/incident-compensation-status.enum';
import { IncidentClosureReason } from 'src/common/enums/incident-closure-reason.enum';
import { IncidentLogDimension } from 'src/common/enums/incident-log-dimension.enum';
import { IncidentEntity } from '../entity/incident.entity';
import { IncidentAdminView } from '../dto/incident-response.dto';
import { IncidentStateService } from './incident-state.service';
import { IncidentConfigService } from './incident-config.service';
import { IncidentAdminService } from './incident-admin.service';

@Injectable()
export class CompensationExecutorService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly state: IncidentStateService,
    private readonly config: IncidentConfigService,
    private readonly adminService: IncidentAdminService,
  ) {}

  async execute(
    adminUserId: string,
    incidentId: string,
  ): Promise<IncidentAdminView> {
    return asyncHandleOperation(async () => {
      await this.dataSource.transaction(async (manager) => {
        const incident = await manager
          .getRepository(IncidentEntity)
          .createQueryBuilder('i')
          .leftJoinAndSelect('i.approvedByChecker', 'checker')
          .setLock('pessimistic_write', undefined, ['i'])
          .where('i.id = :id', { id: incidentId })
          .getOne();
        if (!incident) throw new NotFoundException('Không tìm thấy sự cố');

        if (
          incident.compensationStatus === IncidentCompensationStatus.RECORDED
        ) {
          return;
        }

        if (incident.status !== IncidentStatus.APPROVED) {
          throw new ConflictException(
            'Chỉ thực thi bồi thường khi sự cố đã được duyệt (APPROVED)',
          );
        }
        if (
          incident.compensationStatus !== IncidentCompensationStatus.PENDING &&
          incident.compensationStatus !== IncidentCompensationStatus.FAILED
        ) {
          throw new ConflictException(
            'Trạng thái xử lý tiền không hợp lệ để thực thi',
          );
        }

        if (
          incident.coolingUntil &&
          incident.coolingUntil.getTime() > Date.now()
        ) {
          throw new ConflictException(
            'Chưa qua thời gian chờ (cooling) — chưa thể thực thi',
          );
        }

        const threshold = await this.config.getDualApprovalThreshold();
        if (
          toNumber(incident.claimedAmount) >= threshold &&
          !incident.approvedByChecker
        ) {
          throw new ConflictException(
            'Cần duyệt cấp 2 (maker-checker) trước khi thực thi',
          );
        }

        const approved = toNumber(incident.approvedCompensationAmount);
        const taskerBorne = toNumber(incident.taskerBorneAmount);
        const platformBorne = toNumber(incident.platformBorneAmount);
        if (approved <= 0 || taskerBorne + platformBorne !== approved) {
          throw new UnprocessableEntityException(
            'Phân bổ bồi thường không hợp lệ',
          );
        }

        const fromComp = incident.compensationStatus;
        const repo = manager.getRepository(IncidentEntity);

        this.state.assertCompensationTransition(
          fromComp,
          IncidentCompensationStatus.PROCESSING,
        );
        incident.compensationStatus = IncidentCompensationStatus.PROCESSING;
        await repo.save(incident);
        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.COMPENSATION,
          fromComp,
          IncidentCompensationStatus.PROCESSING,
          adminUserId,
          null,
        );

        this.state.assertCompensationTransition(
          IncidentCompensationStatus.PROCESSING,
          IncidentCompensationStatus.RECORDED,
        );
        incident.compensationStatus = IncidentCompensationStatus.RECORDED;
        incident.resolvedAt = new Date();

        this.state.assertStatusTransition(
          incident.status,
          IncidentStatus.COMPENSATED,
        );
        incident.status = IncidentStatus.COMPENSATED;
        incident.closureReason = IncidentClosureReason.COMPENSATED;
        await repo.save(incident);

        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.COMPENSATION,
          IncidentCompensationStatus.PROCESSING,
          IncidentCompensationStatus.RECORDED,
          adminUserId,
          `Ghi nhận bồi thường ${approved} VND (tasker ${taskerBorne} + platform ${platformBorne}) — record-only (wallet mock)`,
        );
        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.STATUS,
          IncidentStatus.APPROVED,
          IncidentStatus.COMPENSATED,
          adminUserId,
          null,
        );
      });
      return this.adminService.findOne(incidentId);
    }, 'Lỗi khi thực thi bồi thường');
  }
}
