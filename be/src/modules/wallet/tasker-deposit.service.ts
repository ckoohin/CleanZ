import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { TaskerDepositTransactionType } from 'src/common/enums/tasker-deposit-transaction-type.enum';
import { TaskerStatus } from 'src/common/enums/tasker-status.enum';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { toNumber } from 'src/common/helpers/number.helper';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { TaskerDepositTransactionEntity } from './entity/tasker-deposit-transaction.entity';
import { WalletService } from './wallet.service';

const DEPOSIT_TOP_UP_GRACE_DAYS = 7;

@Injectable()
export class TaskerDepositService {
  constructor(
    private readonly walletService: WalletService,
    private readonly dataSource: DataSource,
  ) {}

  async getMyTransactions(
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

  getTaskerTransactions(
    taskerId: string,
  ): Promise<TaskerDepositTransactionEntity[]> {
    return this.dataSource.getRepository(TaskerDepositTransactionEntity).find({
      where: { tasker: { id: taskerId } },
      relations: ['booking'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async assertCanCoverCashCommission(
    manager: EntityManager,
    taskerId: string,
    commissionAmount: number,
  ): Promise<void> {
    const tasker = await this.lockTasker(manager, taskerId);
    const currentDeposit = toNumber(tasker.currentDepositBalance);

    if (currentDeposit < commissionAmount) {
      throw new BadRequestException(
        `Ký quỹ không đủ để nhận đơn tiền mặt. Cần ${commissionAmount}, hiện có ${currentDeposit}`,
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
    const balanceBefore = toNumber(tasker.currentDepositBalance);

    if (balanceBefore < amount) {
      throw new BadRequestException(
        'Ký quỹ không đủ để khấu trừ chiết khấu đơn tiền mặt',
      );
    }

    const balanceAfter = balanceBefore - amount;
    tasker.currentDepositBalance = balanceAfter;
    tasker.depositTopupDue =
      balanceAfter < toNumber(tasker.depositAmount)
        ? (tasker.depositTopupDue ?? this.buildTopUpDueDate())
        : null;
    const savedTasker = await manager.getRepository(TaskerEntity).save(tasker);

    await manager.getRepository(TaskerDepositTransactionEntity).save(
      manager.getRepository(TaskerDepositTransactionEntity).create({
        tasker: savedTasker,
        booking,
        type: TaskerDepositTransactionType.CASH_COMMISSION_DEDUCT,
        amount: -amount,
        balanceBefore,
        balanceAfter,
        description: `Khấu trừ chiết khấu tiền mặt từ booking ${booking.bookingCode}`,
      }),
    );

    return savedTasker;
  }

  async refundForTerminatedTasker(
    manager: EntityManager,
    taskerId: string,
  ): Promise<number> {
    const tasker = await this.lockTasker(manager, taskerId);
    if (tasker.status !== TaskerStatus.TERMINATED) {
      throw new ConflictException(
        'Chỉ hoàn ký quỹ khi Tasker đã ở trạng thái TERMINATED',
      );
    }

    const amount = toNumber(tasker.currentDepositBalance);
    if (amount <= 0) {
      throw new BadRequestException('Tasker không còn ký quỹ để hoàn');
    }

    const taskerWallet = await this.walletService.getOrCreateTaskerWallet(
      manager,
      tasker,
    );
    await this.walletService.creditWallet(manager, {
      wallet: taskerWallet,
      amount,
      type: WalletTransactionType.DEPOSIT_RELEASE,
      referenceId: tasker.id,
      referenceType: 'TASKER_TERMINATION',
      description: 'Hoàn ký quỹ khi Tasker nghỉ việc',
    });

    tasker.currentDepositBalance = 0;
    tasker.depositTopupDue = null;
    await manager.getRepository(TaskerEntity).save(tasker);
    await manager.getRepository(TaskerDepositTransactionEntity).save(
      manager.getRepository(TaskerDepositTransactionEntity).create({
        tasker,
        type: TaskerDepositTransactionType.TERMINATION_REFUND,
        amount: -amount,
        balanceBefore: amount,
        balanceAfter: 0,
        description: 'Hoàn toàn bộ ký quỹ vào ví thu nhập khi nghỉ việc',
      }),
    );

    return amount;
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

  private normalizeAmount(value: number): number {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Số tiền ký quỹ không hợp lệ');
    }
    return amount;
  }

  private buildTopUpDueDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() + DEPOSIT_TOP_UP_GRACE_DAYS);
    return date;
  }
}
