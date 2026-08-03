import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { toNumber } from 'src/common/helpers/number.helper';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { WalletService } from 'src/modules/wallet/wallet.service';
import { IncidentEntity } from '../entity/incident.entity';
import { IncidentConfigService } from './incident-config.service';

const INCIDENT_HOLD_REF = 'INCIDENT_HOLD';

/**
 * Tạm giữ (HOLD) một phần ví Tasker khi tiếp nhận điều tra, để Tasker không rút trốn
 * nghĩa vụ bồi thường. Release lại khi sự cố kết thúc (bồi thường/từ chối/đóng).
 * Chỉ giữ trên `wallet.balance` — Tasker chỉ còn một ví (ký quỹ đã gộp vào ví).
 */
@Injectable()
export class IncidentDepositHoldService {
  constructor(
    private readonly walletService: WalletService,
    private readonly config: IncidentConfigService,
  ) {}

  /**
   * Giữ = min(khách yêu cầu, TRẦN CHÍNH SÁCH, số dư ví). Ghi `hold_amount` lên incident
   * (chưa save); trả về số đã giữ. Idempotent: đã giữ rồi (hold_amount != null) thì bỏ qua.
   *
   * Chặn bằng `policyCap` là bắt buộc: số khách yêu cầu chỉ là con số họ TỰ khai, trong khi
   * trách nhiệm tối đa Tasker có thể phải gánh là trần chính sách. Nếu giữ theo số khai,
   * một khách khai khống sát trần claim sẽ đóng băng ví Tasker gấp đôi mức rủi ro thật.
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
    const policyCap = await this.config.getCompensationPolicyCap();
    const maxExposure = Math.min(claimed, policyCap);
    const holdAmount = Math.max(
      0,
      Math.min(maxExposure, toNumber(wallet.balance)),
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
   * Co khoản đang giữ xuống đúng mức rủi ro CÒN LẠI sau khi Admin đã ra quyết định.
   *
   * Lúc tiếp nhận, hệ thống buộc phải giữ theo số khách TỰ KHAI vì chưa biết Tasker thực sự
   * phải chịu bao nhiêu. Khi quyết định đã có `taskerBorne`, phần giữ vượt quá con số đó
   * không còn căn cứ, mà giữ thừa thì gây hại thật chứ không trung tính:
   *
   *  • Ví bị đóng băng chặn luôn `holdCashCommission` ⟹ Tasker không nhận được đơn tiền mặt
   *    ⟹ không có thu nhập ⟹ chính khoản nợ bồi thường lại không có nguồn để thu.
   *  • Tiền bị giữ bởi sự cố A là VÔ HÌNH với sự cố B: `recoverable` ở B tính trên `balance`,
   *    nên phần đáng lẽ thu được bị ghi thành nợ và quỹ SYSTEM phải ứng ra — nền tảng đi đòi
   *    một người mà tiền của họ đang bị chính mình giữ.
   *
   * CHỈ CO, KHÔNG NỚI. Nới thêm nghĩa là siết tiền mới về của Tasker dựa trên một bản nháp
   * chưa chốt; còn co lại thì luôn an toàn vì mức rủi ro chỉ có thể giảm so với số khai.
   * Trả về số đang giữ sau khi co.
   */
  async shrinkTo(
    manager: EntityManager,
    incident: IncidentEntity,
    targetAmount: number,
  ): Promise<number> {
    const held = toNumber(incident.taskerWalletHoldAmount);
    const target = Math.max(0, Math.floor(targetAmount));
    if (held <= target) return held;

    const owner = incident.tasker ?? null;
    if (!owner) return held;

    const wallet = await this.walletService.getOrCreateTaskerWallet(
      manager,
      owner,
    );
    const excess = Math.min(held - target, toNumber(wallet.holdBalance));
    if (excess <= 0) return held;

    await this.walletService.releaseFunds(manager, {
      wallet,
      amount: excess,
      type: WalletTransactionType.DEPOSIT_RELEASE,
      referenceId: incident.id,
      referenceType: INCIDENT_HOLD_REF,
      description:
        `Trả lại phần giữ thừa sau thẩm định sự cố ` +
        `${incident.incidentCode ?? incident.id} (giữ ${held} → ${held - excess})`,
    });
    incident.taskerWalletHoldAmount = held - excess;
    return incident.taskerWalletHoldAmount;
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
