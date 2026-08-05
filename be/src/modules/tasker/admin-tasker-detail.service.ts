import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskerServiceEntity } from './entity/tasker-service.entity';
import { TaskerEquipmentEntity } from './entity/tasker-equipment.entity';
import { TaskerEquipmentDebtEntity } from './entity/tasker-equipment-debt.entity';
import { TaskerScheduleEntity } from './entity/tasker-schedule.entity';
import { TaskerCoverageEntity } from './entity/tasker-coverage.entity';
import { TaskerEntity } from './entity/tasker.entity';
import { WalletEntity } from '../wallet/entity/wallet.entity';
import { WalletTransactionEntity } from '../wallet/entity/wallet-transaction.entity';
import { WalletOwnerType } from '../../common/enums/wallet-owner-type.enum';
import { WalletTransactionType } from '../../common/enums/wallet-transaction-type.enum';
@Injectable()
export class AdminTaskerDetailService {
  constructor(
    @InjectRepository(TaskerEntity)
    private readonly taskerRepository: Repository<TaskerEntity>,
    @InjectRepository(TaskerServiceEntity)
    private readonly taskerServiceRepository: Repository<TaskerServiceEntity>,
    @InjectRepository(TaskerEquipmentEntity)
    private readonly taskerEquipmentRepository: Repository<TaskerEquipmentEntity>,
    @InjectRepository(TaskerEquipmentDebtEntity)
    private readonly taskerEquipmentDebtRepository: Repository<TaskerEquipmentDebtEntity>,
    @InjectRepository(TaskerScheduleEntity)
    private readonly taskerScheduleRepository: Repository<TaskerScheduleEntity>,
    @InjectRepository(TaskerCoverageEntity)
    private readonly taskerCoverageRepository: Repository<TaskerCoverageEntity>,
    @InjectRepository(WalletEntity)
    private readonly walletRepository: Repository<WalletEntity>,
    @InjectRepository(WalletTransactionEntity)
    private readonly walletTransactionRepository: Repository<WalletTransactionEntity>,
  ) {}

  // ==========================================
  // SERVICES
  // ==========================================
  async getTaskerServices(taskerId: string) {
    const services = await this.taskerServiceRepository.find({
      where: { taskerId },
      relations: ['service'],
    });
    return services.map((ts) => ({
      id: ts.id,
      serviceId: ts.serviceId,
      name: ts.service.name,
      iconUrl: ts.service.iconUrl,
      isActive: ts.isActive,
      testedAt: ts.testedAt,
      certificateUrl: ts.certificateUrl,
    }));
  }

  async toggleTaskerService(
    taskerId: string,
    serviceId: string,
    isActive: boolean,
  ) {
    const ts = await this.taskerServiceRepository.findOne({
      where: { taskerId, serviceId },
    });
    if (!ts) {
      throw new NotFoundException('Dịch vụ không tồn tại cho Tasker này');
    }
    ts.isActive = isActive;
    await this.taskerServiceRepository.save(ts);
    return { success: true };
  }

  // ==========================================
  // EQUIPMENTS
  // ==========================================
  async getTaskerEquipments(taskerId: string) {
    const equipments = await this.taskerEquipmentRepository.find({
      where: { taskerId },
      order: { issuedAt: 'DESC' },
    });
    const debt = await this.taskerEquipmentDebtRepository.findOne({
      where: { taskerId },
    });

    return {
      equipments,
      debt:
        debt ||
        ({
          totalDebt: 0,
          paidAmount: 0,
          isCleared: true,
        } as TaskerEquipmentDebtEntity),
    };
  }

  // ==========================================
  // SCHEDULE & COVERAGE
  // ==========================================
  async getTaskerSchedule(taskerId: string) {
    const schedules = await this.taskerScheduleRepository.find({
      where: { taskerId },
    });
    const coverages = await this.taskerCoverageRepository.find({
      where: { taskerId },
    });

    return {
      schedules,
      coverages,
    };
  }

  // ==========================================
  // WALLET & REVIEWS (MOCK FOR NOW)
  // ==========================================
  async getTaskerWalletTransactions(
    taskerId: string,
  ): Promise<{ data: any[] }> {
    const wallet = await this.walletRepository.findOne({
      where: { tasker: { id: taskerId }, ownerType: WalletOwnerType.TASKER },
    });
    if (!wallet) return { data: [] };

    const transactions = await this.walletTransactionRepository.find({
      where: { wallet: { id: wallet.id } },
      order: { createdAt: 'DESC' },
      take: 50, // Get last 50 transactions
    });

    const creditTypes = new Set<string>([
      WalletTransactionType.TASKER_EARNING,
      WalletTransactionType.DEPOSIT,
      WalletTransactionType.REFUND,
      WalletTransactionType.DEPOSIT_RELEASE,
    ]);

    return {
      data: transactions.map((tx) => ({
        id: tx.id,
        date: tx.createdAt,
        type: tx.type,
        label: tx.description || tx.type,
        amount: Math.abs(Number(tx.amount)),
        isPositive: creditTypes.has(tx.type),
        balance: Number(tx.balanceAfter),
        status: 'SUCCESS',
      })),
    };
  }

  async getTaskerWalletCashflowChart(
    taskerId: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<{
    data: Array<{
      date: string;
      plusAmount: number;
      minusAmount: number;
      netChange: number;
    }>;
    summary: {
      totalPlus: number;
      totalMinus: number;
      netTotal: number;
    };
  }> {
    const wallet = await this.walletRepository.findOne({
      where: { tasker: { id: taskerId }, ownerType: WalletOwnerType.TASKER },
    });
    if (!wallet) {
      return {
        data: [],
        summary: { totalPlus: 0, totalMinus: 0, netTotal: 0 },
      };
    }

    const query = this.walletTransactionRepository
      .createQueryBuilder('tx')
      .where('tx.wallet = :walletId', { walletId: wallet.id });

    if (fromDate && toDate) {
      const toDateEnd = `${toDate.substring(0, 10)} 23:59:59.999`;
      query.andWhere('tx.createdAt BETWEEN :from AND :to', {
        from: fromDate,
        to: toDateEnd,
      });
    }

    const transactions = await query.orderBy('tx.createdAt', 'ASC').getMany();

    const creditTypes = new Set<string>([
      WalletTransactionType.TASKER_EARNING,
      WalletTransactionType.DEPOSIT,
      WalletTransactionType.REFUND,
      WalletTransactionType.DEPOSIT_RELEASE,
    ]);

    const grouped: Record<
      string,
      { date: string; plusAmount: number; minusAmount: number }
    > = {};

    let totalPlus = 0;
    let totalMinus = 0;

    for (const tx of transactions) {
      const d = tx.createdAt ? new Date(tx.createdAt) : new Date();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${d.getFullYear()}-${m}-${day}`;

      if (!grouped[dateStr]) {
        grouped[dateStr] = { date: dateStr, plusAmount: 0, minusAmount: 0 };
      }

      const amt = Math.abs(Number(tx.amount));
      if (creditTypes.has(tx.type)) {
        grouped[dateStr].plusAmount += amt;
        totalPlus += amt;
      } else {
        grouped[dateStr].minusAmount += amt;
        totalMinus += amt;
      }
    }

    const chartItems = Object.values(grouped)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => ({
        ...item,
        netChange: item.plusAmount - item.minusAmount,
      }));

    return {
      data: chartItems,
      summary: {
        totalPlus,
        totalMinus,
        netTotal: totalPlus - totalMinus,
      },
    };
  }

  async getTaskerWalletSummary(
    taskerId: string,
  ): Promise<{ data: { balance: number; deposit: number } }> {
    const wallet = await this.walletRepository.findOne({
      where: { tasker: { id: taskerId }, ownerType: WalletOwnerType.TASKER },
    });

    return {
      data: {
        balance: wallet ? Number(wallet.balance) : 0,
        deposit: wallet ? Number(wallet.holdBalance) : 0,
      },
    };
  }

  async getTaskerReviews(_taskerId: string) {
    await Promise.resolve();
    return { data: [], total: 0, averageRating: 0 };
  }
}
