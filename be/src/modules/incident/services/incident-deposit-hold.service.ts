import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { toNumber } from 'src/common/helpers/number.helper';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { WalletService } from 'src/modules/wallet/wallet.service';
import { IncidentEntity } from '../entity/incident.entity';

const INCIDENT_HOLD_REF = 'INCIDENT_HOLD';

/**
 * P0.2 — Tạm giữ (HOLD) một phần ví Tasker khi tiếp nhận điều tra, để Tasker không rút trốn
 * nghĩa vụ bồi thường. Release lại khi sự cố kết thúc (bồi thường/từ chối/đóng).
 * Chỉ giữ được từ `wallet.balance` (cọc gốc `currentDepositBalance` vốn không rút qua ví).
 */
@Injectable()
export class IncidentDepositHoldService {
  constructor(private readonly walletService: WalletService) {}

  /**
   * Giữ = min(tổng khách yêu cầu, số dư ví hiện có). Ghi `hold_amount` lên incident (chưa save).
   * Trả về số đã giữ. Idempotent: nếu đã giữ rồi (hold_amount != null) thì bỏ qua.
   */
  async holdForAccept(
    manager: EntityManager,
    incident: IncidentEntity,
    tasker: TaskerEntity,
  ): Promise<number> {
    if (incident.taskerWalletHoldAmount != null) {
      return toNumber(incident.taskerWalletHoldAmount);
    }
    const wallet = await this.walletService.getOrCreateTaskerWallet(
      manager,
      tasker,
    );
    const claimed = toNumber(incident.claimedAmount);
    const holdAmount = Math.max(
      0,
      Math.min(claimed, toNumber(wallet.balance)),
    );
    if (holdAmount > 0) {
      await this.walletService.holdFunds(manager, {
        wallet,
        amount: holdAmount,
        type: WalletTransactionType.DEPOSIT_HOLD,
        referenceId: incident.id,
        referenceType: INCIDENT_HOLD_REF,
        description: `Tạm giữ cọc điều tra sự cố ${incident.incidentCode ?? incident.id}`,
      });
    }
    incident.taskerWalletHoldAmount = holdAmount;
    return holdAmount;
  }

  /**
   * Giải phóng phần đã giữ về `wallet.balance`. Ghi `hold_amount=0` lên incident (chưa save).
   * Idempotent: an toàn khi gọi nhiều lần / khi chưa từng giữ.
   */
  async release(
    manager: EntityManager,
    incident: IncidentEntity,
    tasker?: TaskerEntity | null,
  ): Promise<number> {
    const held = toNumber(incident.taskerWalletHoldAmount);
    if (held <= 0) {
      incident.taskerWalletHoldAmount = 0;
      return 0;
    }
    // Tự nạp tasker nếu caller chưa load (tránh leak hold ở các luồng close/withdraw).
    let owner: TaskerEntity | null = tasker ?? incident.tasker ?? null;
    if (!owner) {
      const loaded = await manager.getRepository(IncidentEntity).findOne({
        where: { id: incident.id },
        relations: ['tasker'],
      });
      owner = loaded?.tasker ?? null;
    }
    if (!owner) {
      incident.taskerWalletHoldAmount = 0;
      return 0;
    }
    const wallet = await this.walletService.getOrCreateTaskerWallet(
      manager,
      owner,
    );
    const releasable = Math.min(held, toNumber(wallet.holdBalance));
    if (releasable > 0) {
      await this.walletService.releaseFunds(manager, {
        wallet,
        amount: releasable,
        type: WalletTransactionType.DEPOSIT_RELEASE,
        referenceId: incident.id,
        referenceType: INCIDENT_HOLD_REF,
        description: `Giải phóng tạm giữ sự cố ${incident.incidentCode ?? incident.id}`,
      });
    }
    incident.taskerWalletHoldAmount = 0;
    return releasable;
  }
}
