import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { toNumber } from 'src/common/helpers/number.helper';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { SYSTEM_CONFIG_KEYS } from 'src/modules/system-config/system-config.keys';
import { SystemConfigService } from 'src/modules/system-config/system-config.service';
import { TaskerDepositTransactionEntity } from './entity/tasker-deposit-transaction.entity';
import { WalletService } from './wallet.service';
import { WalletEntity } from './entity/wallet.entity';
import { sumOutstandingDebt } from './entity/tasker-debt.entity';

/** Ref cho bút toán giữ/thu/giải phóng hoa hồng đơn tiền mặt. */
const CASH_COMMISSION_HOLD_REF = 'BOOKING_CASH_COMMISSION_HOLD';

/**
 * Tasker chỉ còn MỘT ví (bảng `wallets`) — cơ chế ký quỹ riêng đã bị bỏ, số dư cọc cũ
 * đã gộp vào ví (migration MergeTaskerDepositIntoWallet). Service này giữ các luật liên
 * quan tới số dư ví của Tasker: sàn nhận đơn và khấu trừ hoa hồng đơn tiền mặt.
 */
@Injectable()
export class TaskerBalanceService {
  constructor(
    private readonly walletService: WalletService,
    private readonly dataSource: DataSource,
    private readonly systemConfig: SystemConfigService,
  ) {}

  /** Sàn số dư ví để Tasker được nhận đơn. 0 = không giới hạn. */
  async getMinAcceptBalance(manager: EntityManager): Promise<number> {
    return this.systemConfig.getRegisteredNumber(
      manager,
      SYSTEM_CONFIG_KEYS.TASKER_MIN_ACCEPT_BALANCE_VND,
    );
  }

  /**
   * Chặn Tasker nhận đơn mới khi số dư ví xuống dưới sàn admin cấu hình.
   */
  async assertMeetsMinAcceptBalance(
    manager: EntityManager,
    taskerId: string,
  ): Promise<void> {
    const minBalance = await this.getMinAcceptBalance(manager);
    if (minBalance <= 0) {
      return;
    }

    const tasker = await this.lockTasker(manager, taskerId);
    const wallet = await this.lockTaskerWallet(manager, tasker);
    const balance = toNumber(wallet.balance);

    if (balance < minBalance) {
      throw new BadRequestException(
        `Số dư ví tối thiểu để nhận đơn là ${minBalance.toLocaleString('vi-VN')}đ. ` +
          `Ví của bạn đang có ${balance.toLocaleString('vi-VN')}đ — vui lòng nạp thêm để tiếp tục nhận việc.`,
      );
    }
  }

  /**
   * GIỮ hoa hồng đơn tiền mặt trên ví Tasker tại thời điểm nhận đơn.
   *
   * Ghi `booking.taskerCommissionHoldAmount` (chưa save — caller lưu booking sau) để lúc
   * quyết toán biết thu bao nhiêu, và để sweep dọn được hold sót nếu đơn kết thúc bất
   * thường. Idempotent: gọi lại trên booking đã giữ thì giải phóng khoản cũ trước.
   *
   * Cũng là chốt chặn NỢ bồi thường. Chỉ chặn riêng đơn tiền mặt — đây là loại đơn duy
   * nhất Tasker trực tiếp cầm tiền của khách, rủi ro cao nhất khi họ đang nợ. Đơn trả qua
   * ví/online vẫn mở để họ còn đường kiếm thu nhập mà trả nợ; chặn hết mọi loại đơn sẽ
   * thành bẫy nợ: không có việc → không có thu nhập → nợ không bao giờ thu hồi được.
   */
  async holdCashCommission(
    manager: EntityManager,
    taskerId: string,
    booking: BookingEntity,
    commissionAmount: number,
  ): Promise<void> {
    const debt = await sumOutstandingDebt(manager, taskerId);
    if (debt > 0) {
      throw new BadRequestException(
        `Bạn còn nợ ${debt.toLocaleString('vi-VN')}đ với nền tảng nên tạm thời chưa nhận được ` +
          'đơn thanh toán tiền mặt. Bạn vẫn nhận được đơn thanh toán qua ví/online, ' +
          'và khoản nợ sẽ được trừ dần từ thu nhập.',
      );
    }

    await this.releaseCashCommissionHold(manager, booking);

    const amount = Math.round(commissionAmount);
    if (amount <= 0) {
      booking.taskerCommissionHoldAmount = 0;
      return;
    }

    const tasker = await this.lockTasker(manager, taskerId);
    const wallet = await this.lockTaskerWallet(manager, tasker);
    const balance = toNumber(wallet.balance);
    if (balance < amount) {
      throw new BadRequestException(
        `Số dư ví không đủ để nhận đơn tiền mặt. Cần giữ ${amount.toLocaleString('vi-VN')}đ ` +
          `cho phí nền tảng, ví đang có ${balance.toLocaleString('vi-VN')}đ`,
      );
    }

    await this.walletService.holdFunds(manager, {
      wallet,
      amount,
      type: WalletTransactionType.DEPOSIT_HOLD,
      booking,
      referenceId: booking.id,
      referenceType: CASH_COMMISSION_HOLD_REF,
      description: `Tạm giữ phí nền tảng đơn tiền mặt ${booking.bookingCode}`,
    });
    booking.taskerCommissionHoldAmount = amount;
  }

  /**
   * THU khoản đã giữ khi quyết toán. Không thể thiếu tiền vì đã giữ từ lúc nhận đơn.
   *
   * Giá đơn có thể đổi giữa chừng (phụ phí, admin sửa giá) nên phí thực tế lệch khoản đã
   * giữ: thiếu thì trừ thêm phần chênh từ số dư, thừa thì trả lại. Phần chênh nhỏ hơn
   * nhiều so với toàn bộ phí nên rủi ro thất bại giảm hẳn.
   */
  async captureCashCommission(
    manager: EntityManager,
    taskerId: string,
    booking: BookingEntity,
    commissionAmount: number,
  ): Promise<void> {
    const fee = Math.round(commissionAmount);
    const held = Math.round(toNumber(booking.taskerCommissionHoldAmount));
    if (fee <= 0 && held <= 0) return;

    const tasker = await this.lockTasker(manager, taskerId);
    const wallet = await this.lockTaskerWallet(manager, tasker);
    const captured = Math.min(held, fee);

    if (captured > 0) {
      await this.walletService.captureHeldFunds(manager, {
        wallet,
        amount: captured,
        type: WalletTransactionType.PLATFORM_FEE,
        booking,
        referenceId: booking.id,
        referenceType: CASH_COMMISSION_HOLD_REF,
        description: `Thu phí nền tảng (đã tạm giữ) đơn ${booking.bookingCode}`,
      });
    }
    if (held > fee) {
      await this.walletService.releaseFunds(manager, {
        wallet,
        amount: held - fee,
        type: WalletTransactionType.DEPOSIT_RELEASE,
        booking,
        referenceId: booking.id,
        referenceType: CASH_COMMISSION_HOLD_REF,
        description: `Hoàn phần giữ thừa đơn ${booking.bookingCode}`,
      });
    }
    if (fee > held) {
      // Giá đơn tăng sau khi nhận → thu nốt phần chênh từ số dư khả dụng.
      await this.walletService.debitWallet(manager, {
        wallet,
        amount: fee - held,
        type: WalletTransactionType.PLATFORM_FEE,
        booking,
        description: `Thu phần phí nền tảng phát sinh thêm đơn ${booking.bookingCode}`,
      });
    }
    await this.clearHoldMarker(manager, booking);
  }

  /**
   * Giải phóng khoản giữ (huỷ đơn, đổi Tasker, hoặc sweep dọn hold sót). Idempotent và
   * chịu được trường hợp ví đã bị giải phóng bằng đường khác.
   */
  async releaseCashCommissionHold(
    manager: EntityManager,
    booking: BookingEntity,
  ): Promise<number> {
    const held = Math.round(toNumber(booking.taskerCommissionHoldAmount));
    const taskerId = booking.tasker?.id;
    if (held <= 0 || !taskerId) {
      await this.clearHoldMarker(manager, booking);
      return 0;
    }

    const tasker = await this.lockTasker(manager, taskerId);
    const wallet = await this.lockTaskerWallet(manager, tasker);
    const releasable = Math.min(held, toNumber(wallet.holdBalance));
    if (releasable > 0) {
      await this.walletService.releaseFunds(manager, {
        wallet,
        amount: releasable,
        type: WalletTransactionType.DEPOSIT_RELEASE,
        booking,
        referenceId: booking.id,
        referenceType: CASH_COMMISSION_HOLD_REF,
        description: `Giải phóng phí nền tảng đã giữ đơn ${booking.bookingCode}`,
      });
    }
    await this.clearHoldMarker(manager, booking);
    return releasable;
  }

  /**
   * Xoá mốc hold trên booking — ghi xuống DB luôn, không chờ caller save.
   * Quyết toán lưu booking TRƯỚC khi thu phí, nên nếu chỉ sửa entity trong bộ nhớ thì mốc
   * cũ còn nguyên dưới DB và sweep sẽ tưởng là hold sót rồi "giải phóng" khoản đã thu.
   */
  private async clearHoldMarker(
    manager: EntityManager,
    booking: BookingEntity,
  ): Promise<void> {
    booking.taskerCommissionHoldAmount = 0;
    if (!booking.id) return;
    await manager
      .getRepository(BookingEntity)
      .update({ id: booking.id }, { taskerCommissionHoldAmount: 0 });
  }

  async deductCashCommission(
    manager: EntityManager,
    taskerId: string,
    booking: BookingEntity,
    commissionAmount: number,
  ): Promise<TaskerEntity> {
    const tasker = await this.lockTasker(manager, taskerId);
    const amount = this.normalizeAmount(commissionAmount);
    const wallet = await this.lockTaskerWallet(manager, tasker);

    if (toNumber(wallet.balance) < amount) {
      throw new BadRequestException(
        'Số dư ví không đủ để khấu trừ phí nền tảng đơn tiền mặt',
      );
    }

    await this.walletService.debitWallet(manager, {
      wallet,
      amount,
      type: WalletTransactionType.PLATFORM_FEE,
      booking,
      description: `Khấu trừ phí nền tảng từ ví cho booking ${booking.bookingCode}`,
    });

    return tasker;
  }

  /**
   * Lịch sử ký quỹ CŨ (read-only). Cơ chế ký quỹ đã bỏ nên không còn bút toán mới;
   * giữ lại để Tasker/Admin tra cứu các khoản trừ cọc trước đây.
   */
  async getMyLegacyDepositTransactions(
    userId: string,
  ): Promise<TaskerDepositTransactionEntity[]> {
    return this.dataSource
      .getRepository(TaskerDepositTransactionEntity)
      .createQueryBuilder('transaction')
      .innerJoin('transaction.tasker', 'tasker')
      .innerJoin('tasker.user', 'user')
      .leftJoinAndSelect('transaction.booking', 'booking')
      .where('user.id = :userId', { userId })
      .orderBy('transaction.createdAt', 'DESC')
      .getMany();
  }

  getLegacyDepositTransactions(
    taskerId: string,
  ): Promise<TaskerDepositTransactionEntity[]> {
    return this.dataSource.getRepository(TaskerDepositTransactionEntity).find({
      where: { tasker: { id: taskerId } },
      relations: ['booking'],
      order: { createdAt: 'DESC' },
    });
  }

  private async lockTasker(
    manager: EntityManager,
    taskerId: string,
  ): Promise<TaskerEntity> {
    const tasker = await manager.getRepository(TaskerEntity).findOne({
      where: { id: taskerId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!tasker) {
      throw new NotFoundException('Không tìm thấy hồ sơ Tasker');
    }
    return tasker;
  }

  private async lockTaskerWallet(
    manager: EntityManager,
    tasker: TaskerEntity,
  ): Promise<WalletEntity> {
    const wallet = await this.walletService.getOrCreateTaskerWallet(
      manager,
      tasker,
    );
    const lockedWallet = await manager.getRepository(WalletEntity).findOne({
      where: { id: wallet.id },
      lock: { mode: 'pessimistic_write' },
    });

    if (!lockedWallet) {
      throw new NotFoundException('Không tìm thấy ví Tasker');
    }

    return lockedWallet;
  }

  private normalizeAmount(value: number): number {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Số tiền khấu trừ không hợp lệ');
    }
    return amount;
  }
}
