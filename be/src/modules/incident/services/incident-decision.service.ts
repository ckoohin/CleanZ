import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { toNumber } from 'src/common/helpers/number.helper';
import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { IncidentCompensationStatus } from 'src/common/enums/incident-compensation-status.enum';
import { IncidentClosureReason } from 'src/common/enums/incident-closure-reason.enum';
import { IncidentLogDimension } from 'src/common/enums/incident-log-dimension.enum';
import { WalletOwnerType } from 'src/common/enums/wallet-owner-type.enum';
import { WalletEntity } from 'src/modules/wallet/entity/wallet.entity';
import { IncidentEntity } from '../entity/incident.entity';
import { IncidentDamageItemEntity } from '../entity/incident-damage-item.entity';
import {
  DecideIncidentDto,
  IncidentDecision,
} from '../dto/decide-incident.dto';
import { IncidentAdminView } from '../dto/incident-response.dto';
import { IncidentStateService } from './incident-state.service';
import { IncidentConfigService } from './incident-config.service';
import { IncidentAdminService } from './incident-admin.service';
import { FraudStrikeService } from './fraud-strike.service';

@Injectable()
export class IncidentDecisionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly state: IncidentStateService,
    private readonly config: IncidentConfigService,
    private readonly adminService: IncidentAdminService,
    private readonly fraudStrike: FraudStrikeService,
  ) {}

  async decide(
    investigatorUserId: string,
    incidentId: string,
    dto: DecideIncidentDto,
  ): Promise<IncidentAdminView> {
    return asyncHandleOperation(async () => {
      await this.dataSource.transaction(async (manager) => {
        const incident = await manager
          .getRepository(IncidentEntity)
          .createQueryBuilder('i')
          .leftJoinAndSelect('i.tasker', 'tasker')
          .leftJoinAndSelect('i.customer', 'customer')
          .setLock('pessimistic_write', undefined, ['i'])
          .where('i.id = :id', { id: incidentId })
          .getOne();
        if (!incident) throw new NotFoundException('Không tìm thấy sự cố');

        if (dto.decision === IncidentDecision.APPROVE) {
          await this.approve(manager, incident, investigatorUserId, dto);
        } else {
          await this.reject(manager, incident, investigatorUserId, dto);
        }
      });
      return this.adminService.findOne(incidentId);
    }, 'Lỗi khi quyết định sự cố');
  }

  async approveCompensation(
    checkerUserId: string,
    incidentId: string,
  ): Promise<IncidentAdminView> {
    return asyncHandleOperation(async () => {
      await this.dataSource.transaction(async (manager) => {
        const incident = await manager
          .getRepository(IncidentEntity)
          .createQueryBuilder('i')
          .leftJoinAndSelect('i.decidedByInvestigator', 'inv')
          .setLock('pessimistic_write', undefined, ['i'])
          .where('i.id = :id', { id: incidentId })
          .getOne();
        if (!incident) throw new NotFoundException('Không tìm thấy sự cố');

        if (
          incident.status !== IncidentStatus.APPROVED ||
          incident.compensationStatus !== IncidentCompensationStatus.PENDING
        ) {
          throw new ConflictException(
            'Chỉ duyệt cấp 2 khi sự cố đã APPROVED và đang chờ xử lý tiền',
          );
        }
        const threshold = await this.config.getDualApprovalThreshold();
        if (toNumber(incident.claimedAmount) < threshold) {
          throw new ConflictException(
            'Sự cố này không cần duyệt cấp 2 (dưới ngưỡng)',
          );
        }
        if (incident.decidedByInvestigator?.id === checkerUserId) {
          throw new ConflictException(
            'Người duyệt phải khác người điều tra (maker-checker)',
          );
        }

        incident.approvedByChecker = { id: checkerUserId } as never;
        await manager.getRepository(IncidentEntity).save(incident);
        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.COMPENSATION,
          incident.compensationStatus,
          incident.compensationStatus,
          checkerUserId,
          'Duyệt cấp 2 (maker-checker) — sẵn sàng thực thi sau cooling',
        );
      });
      return this.adminService.findOne(incidentId);
    }, 'Lỗi khi duyệt bồi thường');
  }

  private async approve(
    manager: EntityManager,
    incident: IncidentEntity,
    investigatorUserId: string,
    dto: DecideIncidentDto,
  ): Promise<void> {
    this.state.assertStatusTransition(incident.status, IncidentStatus.APPROVED);
    const inputs = dto.items ?? [];
    const taskerBorne = dto.taskerBorneAmount ?? 0;
    const platformBorne = dto.platformBorneAmount ?? 0;

    const items = await manager.getRepository(IncidentDamageItemEntity).find({
      where: { incident: { id: incident.id } },
    });
    const itemById = new Map(items.map((i) => [i.id, i]));

    let totalApproved = 0;
    for (const input of inputs) {
      const item = itemById.get(input.itemId);
      if (!item) {
        throw new NotFoundException(
          `Không tìm thấy hạng mục thiệt hại ${input.itemId}`,
        );
      }
      if (item.verifiedAmount == null) {
        throw new UnprocessableEntityException(
          'Phải xác minh thiệt hại (verify) trước khi duyệt',
        );
      }
      if (input.approvedAmount > toNumber(item.verifiedAmount)) {
        throw new UnprocessableEntityException(
          'Số tiền duyệt không được vượt giá trị xác minh',
        );
      }
      item.approvedAmount = input.approvedAmount;
      totalApproved += input.approvedAmount;
      await manager.getRepository(IncidentDamageItemEntity).save(item);
    }

    if (totalApproved <= 0) {
      throw new UnprocessableEntityException('Tổng tiền duyệt phải lớn hơn 0');
    }
    const cap = await this.config.getCompensationPolicyCap();
    if (totalApproved > cap) {
      throw new UnprocessableEntityException(
        `Tổng bồi thường vượt trần chính sách (${cap} VND)`,
      );
    }
    if (taskerBorne + platformBorne !== totalApproved) {
      throw new UnprocessableEntityException(
        'Phân bổ không khớp: tasker + platform phải bằng tổng tiền duyệt',
      );
    }
    const taskerWallet = incident.tasker?.id
      ? await manager.getRepository(WalletEntity).findOne({
          where: {
            tasker: { id: incident.tasker.id },
            ownerType: WalletOwnerType.TASKER,
          },
        })
      : null;
    const availableFunds = toNumber(taskerWallet?.balance);
    if (taskerBorne > availableFunds) {
      throw new UnprocessableEntityException(
        'Phần Tasker chịu vượt số dư ví khả dụng',
      );
    }
    if (
      (taskerBorne > 0 || platformBorne > 0) &&
      !dto.allocationReason &&
      taskerBorne > 0 &&
      platformBorne > 0
    ) {
      throw new UnprocessableEntityException(
        'Cần lý do phân bổ khi nguồn là MIXED',
      );
    }

    const source =
      taskerBorne > 0 && platformBorne > 0
        ? 'MIXED'
        : taskerBorne > 0
          ? 'TASKER_DEPOSIT'
          : 'PLATFORM_FUND';

    const fromStatus = incident.status;
    incident.status = IncidentStatus.APPROVED;
    incident.approvedCompensationAmount = totalApproved;
    incident.taskerBorneAmount = taskerBorne;
    incident.platformBorneAmount = platformBorne;
    incident.allocationReason = dto.allocationReason ?? null;
    incident.compensationSource = source;
    incident.decidedByInvestigator = { id: investigatorUserId } as never;

    const threshold = await this.config.getDualApprovalThreshold();
    if (toNumber(incident.claimedAmount) >= threshold) {
      const coolingHours = await this.config.getCoolingPeriodHours();
      incident.coolingUntil = new Date(Date.now() + coolingHours * 3_600_000);
    }

    this.state.assertCompensationTransition(
      incident.compensationStatus,
      IncidentCompensationStatus.PENDING,
    );
    incident.compensationStatus = IncidentCompensationStatus.PENDING;
    await manager.getRepository(IncidentEntity).save(incident);

    await this.state.log(
      manager,
      incident.id,
      IncidentLogDimension.STATUS,
      fromStatus,
      IncidentStatus.APPROVED,
      investigatorUserId,
      `Duyệt bồi thường ${totalApproved} VND (nguồn ${source})`,
    );
    await this.state.log(
      manager,
      incident.id,
      IncidentLogDimension.COMPENSATION,
      IncidentCompensationStatus.NONE,
      IncidentCompensationStatus.PENDING,
      investigatorUserId,
      null,
    );
  }

  private async reject(
    manager: EntityManager,
    incident: IncidentEntity,
    investigatorUserId: string,
    dto: DecideIncidentDto,
  ): Promise<void> {
    this.state.assertStatusTransition(incident.status, IncidentStatus.REJECTED);
    if (!dto.reason) {
      throw new UnprocessableEntityException('Từ chối phải kèm lý do');
    }
    const fromStatus = incident.status;
    incident.status = IncidentStatus.REJECTED;
    incident.closureReason = IncidentClosureReason.REJECTED;
    await manager.getRepository(IncidentEntity).save(incident);

    await this.state.log(
      manager,
      incident.id,
      IncidentLogDimension.STATUS,
      fromStatus,
      IncidentStatus.REJECTED,
      investigatorUserId,
      dto.reason,
    );

    if (dto.rejectAsFraud && incident.customer?.id) {
      await this.fraudStrike.addStrike(
        manager,
        incident.customer.id,
        incident.id,
        dto.reason,
      );
    }
  }
}
