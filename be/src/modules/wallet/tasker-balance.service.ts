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

  /** Đơn tiền mặt: Tasker thu hộ tiền của khách nên ví phải đủ để trả lại hoa hồng nền tảng. */
  async assertCanCoverCashCommission(
    manager: EntityManager,
    taskerId: string,
    commissionAmount: number,
  ): Promise<void> {
    const tasker = await this.lockTasker(manager, taskerId);
    const wallet = await this.lockTaskerWallet(manager, tasker);
    const balance = toNumber(wallet.balance);

    if (balance < commissionAmount) {
      throw new BadRequestException(
        `Số dư ví không đủ để nhận đơn tiền mặt. Cần ${commissionAmount.toLocaleString('vi-VN')}đ, ` +
          `ví đang có ${balance.toLocaleString('vi-VN')}đ`,
      );
    }
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
      .take(50)
      .getMany();
  }

  getLegacyDepositTransactions(
    taskerId: string,
  ): Promise<TaskerDepositTransactionEntity[]> {
    return this.dataSource.getRepository(TaskerDepositTransactionEntity).find({
      where: { tasker: { id: taskerId } },
      relations: ['booking'],
      order: { createdAt: 'DESC' },
      take: 50,
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
