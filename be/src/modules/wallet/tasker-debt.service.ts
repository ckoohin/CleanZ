import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { toNumber } from 'src/common/helpers/number.helper';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import {
  TaskerDebtEntity,
  TaskerDebtSource,
  TaskerDebtStatus,
  debtOutstanding,
} from './entity/tasker-debt.entity';
import { WalletService } from './wallet.service';
import { TaskerBalanceService } from './tasker-balance.service';

const DEBT_RECOVERY_REF = 'TASKER_DEBT_RECOVERY';

export interface OpenDebtInput {
  taskerId: string;
  source: TaskerDebtSource;
  sourceRefId: string;
  sourceCode?: string | null;
  amount: number;
}

/**
 * Sổ nợ Tasker — sở hữu bởi module ví, không phải module nghiệp vụ sinh ra nợ.
 *
 * Nhờ vậy `wallet` không còn phải import ngược vào `incident` để mượn công thức tính nợ,
 * và mọi nghiệp vụ sau này (phạt, tạm ứng…) chỉ cần thêm một `TaskerDebtSource`.
 */
@Injectable()
export class TaskerDebtService {
  constructor(
    private readonly walletService: WalletService,
    private readonly taskerBalance: TaskerBalanceService,
  ) {}

  /**
   * Ghi nhận một khoản nợ mới. Idempotent theo (source, sourceRefId): gọi lại cho cùng
   * nguồn sẽ cập nhật số gốc thay vì tạo bản ghi thứ hai — quan trọng khi nghiệp vụ gốc
   * được chi trả lại ở version mới sau khi đảo.
   */
  async openDebt(
    manager: EntityManager,
    input: OpenDebtInput,
  ): Promise<TaskerDebtEntity | null> {
    const amount = Math.round(input.amount);
    const repo = manager.getRepository(TaskerDebtEntity);
    const existing = await repo.findOne({
      where: { source: input.source, sourceRefId: input.sourceRefId },
    });

    if (amount <= 0) {
      // Không còn nợ (vd: đảo bồi thường rồi chi lại và lần này thu đủ) → dọn bản ghi cũ.
      if (existing) await repo.remove(existing);
      return null;
    }

    const debt =
      existing ??
      repo.create({
        tasker: { id: input.taskerId } as TaskerEntity,
        source: input.source,
        sourceRefId: input.sourceRefId,
        recoveredAmount: 0,
        writtenOffAmount: 0,
      });
    debt.sourceCode = input.sourceCode ?? null;
    debt.originalAmount = amount;
    debt.status = this.resolveStatus(debt, amount);
    return repo.save(debt);
  }

  /** Tổng nợ còn phải trả của một Tasker. */
  async getOutstandingForTasker(
    manager: EntityManager,
    taskerId: string,
  ): Promise<number> {
    const [row] = await manager
      .getRepository(TaskerDebtEntity)
      .createQueryBuilder('d')
      .select(
        'COALESCE(SUM(d.original_amount - d.recovered_amount - d.written_off_amount), 0)',
        'total',
      )
      .where('d.tasker_id = :taskerId', { taskerId })
      .andWhere('d.status = :status', { status: TaskerDebtStatus.OUTSTANDING })
      .getRawMany<{ total: string }>();
    return Math.max(0, toNumber(row?.total));
  }

  /** Nợ còn lại của riêng một bản ghi nghiệp vụ (vd: một sự cố). */
  async getOutstandingForSource(
    manager: EntityManager,
    source: TaskerDebtSource,
    sourceRefId: string,
  ): Promise<number> {
    const debt = await manager
      .getRepository(TaskerDebtEntity)
      .findOne({ where: { source, sourceRefId } });
    return debt ? debtOutstanding(debt) : 0;
  }

  findBySource(
    manager: EntityManager,
    source: TaskerDebtSource,
    sourceRefId: string,
  ): Promise<TaskerDebtEntity | null> {
    return manager.getRepository(TaskerDebtEntity).findOne({
      where: { source, sourceRefId },
      relations: ['writtenOffByAdmin'],
    });
  }

  /**
   * Thu hồi nợ từ số dư ví khi Tasker có thu nhập mới. Trả về tổng đã thu.
   *
   * CHỪA lại sàn số dư nhận đơn: vét sạch ví thì Tasker rơi dưới sàn, không nhận được đơn
   * mới, không có thu nhập — chính khoản nợ này sẽ không bao giờ đòi được. Chưa kể đơn
   * tiền mặt đang giữ hoa hồng cũng cần ví còn tiền để quyết toán.
   */
  async recoverForTasker(
    manager: EntityManager,
    taskerId: string,
  ): Promise<number> {
    const repo = manager.getRepository(TaskerDebtEntity);
    const debts = await repo
      .createQueryBuilder('d')
      .setLock('pessimistic_write', undefined, ['d'])
      .where('d.tasker_id = :taskerId', { taskerId })
      .andWhere('d.status = :status', { status: TaskerDebtStatus.OUTSTANDING })
      .orderBy('d.created_at', 'ASC')
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
    const reserve = await this.taskerBalance.getMinAcceptBalance(manager);
    let available = toNumber(taskerWallet.balance) - Math.max(0, reserve);
    if (available <= 0) return 0;

    const systemWallet =
      await this.walletService.getOrCreateSystemWallet(manager);
    let totalRecovered = 0;

    for (const debt of debts) {
      if (available <= 0) break;
      const outstanding = debtOutstanding(debt);
      if (outstanding <= 0) continue;

      const pay = Math.min(outstanding, available);
      const label = debt.sourceCode ?? debt.sourceRefId;
      await this.walletService.debitWallet(manager, {
        wallet: taskerWallet,
        amount: pay,
        type: WalletTransactionType.DEPOSIT_DEDUCT,
        referenceId: debt.sourceRefId,
        referenceType: DEBT_RECOVERY_REF,
        description: `Thu hồi nợ ${label}`,
      });
      await this.walletService.creditWallet(manager, {
        wallet: systemWallet,
        amount: pay,
        type: WalletTransactionType.ADJUSTMENT,
        referenceId: debt.sourceRefId,
        referenceType: DEBT_RECOVERY_REF,
        description: `Hoàn quỹ đã ứng cho ${label}`,
      });

      debt.recoveredAmount = toNumber(debt.recoveredAmount) + pay;
      debt.status = this.resolveStatus(debt, toNumber(debt.originalAmount));
      await repo.save(debt);

      available -= pay;
      totalRecovered += pay;
    }
    return totalRecovered;
  }

  /**
   * Xoá nợ có kiểm soát — nền tảng ghi nhận chịu mất khoản không bao giờ thu được.
   *
   * KHÔNG chuyển tiền: quỹ đã chi từ lúc phát sinh nợ. Đây chỉ là chuyển "Tasker nợ ta"
   * thành "nền tảng lỗ", nên phải để lại dấu vết đầy đủ.
   */
  async writeOff(
    manager: EntityManager,
    source: TaskerDebtSource,
    sourceRefId: string,
    adminUserId: string,
    reason: string,
    minAgeDays: number,
  ): Promise<{ writtenOff: number; sourceCode: string | null }> {
    const trimmed = reason?.trim() ?? '';
    if (trimmed.length < 10) {
      throw new UnprocessableEntityException({
        code: 'WRITE_OFF_REASON_REQUIRED',
        message: 'Lý do xoá nợ phải có ít nhất 10 ký tự',
      });
    }

    const repo = manager.getRepository(TaskerDebtEntity);
    const debt = await repo
      .createQueryBuilder('d')
      .setLock('pessimistic_write', undefined, ['d'])
      .where('d.source = :source', { source })
      .andWhere('d.source_ref_id = :sourceRefId', { sourceRefId })
      .getOne();
    if (!debt) {
      throw new NotFoundException({
        code: 'DEBT_NOT_FOUND',
        message: 'Không tìm thấy khoản nợ',
      });
    }

    const outstanding = debtOutstanding(debt);
    if (outstanding <= 0) {
      throw new ConflictException({
        code: 'NO_OUTSTANDING_DEBT',
        message: 'Khoản này không còn nợ để xoá',
      });
    }

    // Chỉ xoá sau khi đã cho cơ chế thu hồi tự động đủ thời gian chạy.
    const ageMs = Date.now() - debt.createdAt.getTime();
    if (ageMs < minAgeDays * 86_400_000) {
      throw new ConflictException({
        code: 'WRITE_OFF_TOO_EARLY',
        message: `Chỉ được xoá nợ sau ${minAgeDays} ngày — hệ thống vẫn đang tự thu hồi khi Tasker có thu nhập`,
      });
    }

    debt.writtenOffAmount = toNumber(debt.writtenOffAmount) + outstanding;
    debt.writtenOffAt = new Date();
    debt.writeOffReason = trimmed;
    debt.writtenOffByAdmin = { id: adminUserId } as never;
    debt.status = TaskerDebtStatus.WRITTEN_OFF;
    await repo.save(debt);

    return { writtenOff: outstanding, sourceCode: debt.sourceCode ?? null };
  }

  private resolveStatus(
    debt: TaskerDebtEntity,
    originalAmount: number,
  ): TaskerDebtStatus {
    const settled =
      toNumber(debt.recoveredAmount) + toNumber(debt.writtenOffAmount);
    if (settled < originalAmount) return TaskerDebtStatus.OUTSTANDING;
    return toNumber(debt.writtenOffAmount) > 0
      ? TaskerDebtStatus.WRITTEN_OFF
      : TaskerDebtStatus.RECOVERED;
  }
}
