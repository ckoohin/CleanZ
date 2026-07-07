import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { toNumber } from 'src/common/helpers/number.helper';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { WalletService } from 'src/modules/wallet/wallet.service';
import { IncidentEntity } from '../entity/incident.entity';

const DEBT_RECOVERY_REF = 'INCIDENT_DEBT_RECOVERY';

/**
 * P0.3 — Thu hồi phần nợ `uncovered` (quỹ SYSTEM đã ứng khi bồi thường mà cọc Tasker không đủ).
 * Khi Tasker có số dư ví (nạp PayPal/earning), trừ dần chuyển về quỹ SYSTEM, giảm outstanding;
 * hết nợ thì gỡ soft-block (`deposit_topup_due=null`). Trừ ví trước, cọc gốc sau.
 */
@Injectable()
export class IncidentDebtRecoveryService {
  constructor(private readonly walletService: WalletService) {}

  /**
   * Thu hồi cho 1 Tasker trong 1 transaction (caller lock). Trả về tổng đã thu hồi.
   */
  async recoverForTasker(
    manager: EntityManager,
    taskerId: string,
  ): Promise<number> {
    const incidentRepo = manager.getRepository(IncidentEntity);
    const debts = await incidentRepo
      .createQueryBuilder('i')
      .setLock('pessimistic_write', undefined, ['i'])
      .where('i.tasker_id = :taskerId', { taskerId })
      .andWhere('i.status = :status', { status: IncidentStatus.COMPENSATED })
      .andWhere(
        'COALESCE(i.uncovered_liability_amount,0) > COALESCE(i.uncovered_recovered_amount,0)',
      )
      .orderBy('i.created_at', 'ASC')
      .getMany();
    if (debts.length === 0) return 0;

    const tasker = await manager
      .getRepository(TaskerEntity)
      .findOne({ where: { id: taskerId } });
    if (!tasker) return 0;

    const taskerWallet = await this.walletService.getOrCreateTaskerWallet(
      manager,
      tasker,
    );
    let available = toNumber(taskerWallet.balance);
    if (available <= 0) return 0;

    const systemWallet =
      await this.walletService.getOrCreateSystemWallet(manager);
    let totalRecovered = 0;

    for (const inc of debts) {
      if (available <= 0) break;
      const outstanding =
        toNumber(inc.uncoveredLiabilityAmount) -
        toNumber(inc.uncoveredRecoveredAmount);
      if (outstanding <= 0) continue;
      const pay = Math.min(outstanding, available);
      // Trừ ví Tasker → chuyển về quỹ SYSTEM (hoàn phần đã ứng).
      await this.walletService.debitWallet(manager, {
        wallet: taskerWallet,
        amount: pay,
        type: WalletTransactionType.DEPOSIT_DEDUCT,
        referenceId: inc.id,
        referenceType: DEBT_RECOVERY_REF,
        description: `Thu hồi nợ bồi thường sự cố ${inc.incidentCode ?? inc.id}`,
      });
      await this.walletService.creditWallet(manager, {
        wallet: systemWallet,
        amount: pay,
        type: WalletTransactionType.ADJUSTMENT,
        referenceId: inc.id,
        referenceType: DEBT_RECOVERY_REF,
        description: `Hoàn quỹ đã ứng cho sự cố ${inc.incidentCode ?? inc.id}`,
      });
      const newRecovered = toNumber(inc.uncoveredRecoveredAmount) + pay;
      inc.uncoveredRecoveredAmount = newRecovered;
      await incidentRepo.update(
        { id: inc.id },
        { uncoveredRecoveredAmount: newRecovered },
      );
      available -= pay;
      totalRecovered += pay;
    }

    // Hết nợ toàn bộ → gỡ soft-block nhận đơn.
    const stillOwing = await incidentRepo
      .createQueryBuilder('i')
      .where('i.tasker_id = :taskerId', { taskerId })
      .andWhere(
        'COALESCE(i.uncovered_liability_amount,0) > COALESCE(i.uncovered_recovered_amount,0)',
      )
      .getCount();
    if (stillOwing === 0 && tasker.depositTopupDue != null) {
      await manager
        .getRepository(TaskerEntity)
        .update({ id: taskerId }, { depositTopupDue: null });
    }

    return totalRecovered;
  }
}
