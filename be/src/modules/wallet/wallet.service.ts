import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { WalletOwnerType } from 'src/common/enums/wallet-owner-type.enum';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { toNumber } from 'src/common/helpers/number.helper';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { WalletTransactionEntity } from './entity/wallet-transaction.entity';
import { WalletEntity } from './entity/wallet.entity';
import { PaginatedData } from 'src/common/helpers/response.interface';
import { WalletListQueryDto } from './dto/wallet-list-query.dto';
import { CreateWithdrawalRequestDto } from './dto/create-withdrawal-request.dto';
import { WithdrawalRequestEntity } from '../finance/entity/withdrawal-request.entity';
import { WithdrawalStatus } from 'src/common/enums/with-drawal-status.enum';
import { MAX_WEEKLY_WITHDRAWALS } from '../finance/services/finance.service';

interface WalletMutationInput {
  wallet: WalletEntity;
  amount: number;
  type: WalletTransactionType;
  booking?: BookingEntity | null;
  referenceId?: string | null;
  referenceType?: string | null;
  description?: string | null;
}

interface WalletTransferInput {
  fromWallet: WalletEntity;
  toWallet: WalletEntity;
  amount: number;
  debitType: WalletTransactionType;
  creditType: WalletTransactionType;
  booking?: BookingEntity | null;
  referenceId?: string | null;
  referenceType?: string | null;
  description?: string | null;
}

export interface WalletResponse {
  id: string;
  ownerType: WalletOwnerType;
  balance: number;
  holdBalance: number;
  taskerId?: string | null;
  customerId?: string | null;
  requiredDeposit?: number;
  currentDepositBalance?: number;
  depositTopupDue?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletTransactionResponse {
  id: string;
  walletId: string;
  bookingId?: string | null;
  referenceId?: string | null;
  referenceType?: string | null;
  type: WalletTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string | null;
  createdAt: Date;
}

export interface WalletTransactionListResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  items: WalletTransactionResponse[];
}

export interface WalletTransactionQueryOpts {
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
}

@Injectable()
export class WalletService {
  constructor(private readonly dataSource: DataSource) {}

  async findAllWallets(
    query: WalletListQueryDto,
  ): Promise<PaginatedData<WalletEntity>> {
    const { page = 1, limit = 20, ownerType, search } = query;
    const skip = (page - 1) * limit;
    const repository = this.dataSource.getRepository(WalletEntity);
    const qb = repository
      .createQueryBuilder('wallet')
      .leftJoinAndSelect('wallet.tasker', 'tasker')
      .leftJoinAndSelect('tasker.user', 'taskerUser')
      .leftJoinAndSelect('wallet.customer', 'customer')
      .leftJoinAndSelect('customer.user', 'customerUser')
      .orderBy('wallet.updatedAt', 'DESC');

    if (ownerType) {
      qb.andWhere('wallet.ownerType = :ownerType', { ownerType });
    }

    if (search?.trim()) {
      qb.andWhere(
        `(
          CAST(wallet.id AS text) ILIKE :search
          OR taskerUser.fullName ILIKE :search
          OR taskerUser.email ILIKE :search
          OR customerUser.fullName ILIKE :search
          OR customerUser.email ILIKE :search
        )`,
        { search: `%${search.trim()}%` },
      );
    }

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getMyTaskerWallet(userId: string): Promise<WalletResponse> {
    return asyncHandleOperation(async () => {
      const tasker = await this.findTaskerByUserId(
        this.dataSource.manager,
        userId,
      );
      const wallet = await this.getOrCreateTaskerWallet(
        this.dataSource.manager,
        tasker,
      );

      return this.mapWallet(wallet);
    }, 'Không thể lấy ví tasker');
  }

  async getMyCustomerWallet(userId: string): Promise<WalletResponse> {
    return asyncHandleOperation(async () => {
      const customer = await this.findCustomerByUserId(
        this.dataSource.manager,
        userId,
      );
      const wallet = await this.getOrCreateCustomerWallet(
        this.dataSource.manager,
        customer,
      );

      return this.mapWallet(wallet);
    }, 'Không thể lấy ví customer');
  }

  async createTaskerWithdrawalRequest(
    userId: string,
    dto: CreateWithdrawalRequestDto,
  ): Promise<WithdrawalRequestEntity> {
    return asyncHandleOperation(async () => {
      return this.dataSource.transaction(async (manager) => {
        const tasker = await this.findTaskerByUserId(manager, userId);
        const wallet = await this.getOrCreateTaskerWallet(manager, tasker);
        const lockedWallet = await this.lockWallet(manager, wallet.id);
        const withdrawalRepository = manager.getRepository(
          WithdrawalRequestEntity,
        );

        const weeklyCount = await withdrawalRepository
          .createQueryBuilder('withdrawal')
          .where('withdrawal.taskerId = :taskerId', { taskerId: tasker.id })
          .andWhere('withdrawal.status IN (:...statuses)', {
            statuses: [
              WithdrawalStatus.PENDING,
              WithdrawalStatus.APPROVED,
              WithdrawalStatus.PROCESSED,
            ],
          })
          .andWhere(
            `DATE_TRUNC('week', withdrawal.createdAt) = DATE_TRUNC('week', NOW())`,
          )
          .getCount();

        if (weeklyCount >= MAX_WEEKLY_WITHDRAWALS) {
          throw new BadRequestException(
            `Bạn chỉ được gửi tối đa ${MAX_WEEKLY_WITHDRAWALS} yêu cầu rút tiền mỗi tuần`,
          );
        }

        const pendingResult = await withdrawalRepository
          .createQueryBuilder('withdrawal')
          .select('COALESCE(SUM(withdrawal.amount), 0)', 'total')
          .where('withdrawal.walletId = :walletId', {
            walletId: lockedWallet.id,
          })
          .andWhere('withdrawal.status = :status', {
            status: WithdrawalStatus.PENDING,
          })
          .getRawOne<{ total: string }>();

        const amount = this.normalizeAmount(dto.amount);
        const pendingAmount = toNumber(pendingResult?.total ?? 0);
        const availableBalance = toNumber(lockedWallet.balance) - pendingAmount;

        if (amount > availableBalance) {
          throw new BadRequestException(
            `Số dư khả dụng không đủ. Số dư có thể rút: ${availableBalance}`,
          );
        }

        const bankName = tasker.bankName?.trim();
        const bankAccount = tasker.bankAccountNumber?.trim();

        if (!bankName || !bankAccount) {
          throw new BadRequestException(
            'Vui lòng cập nhật đầy đủ ngân hàng và số tài khoản trước khi rút tiền',
          );
        }

        const request = withdrawalRepository.create({
          taskerId: tasker.id,
          walletId: lockedWallet.id,
          wallet: lockedWallet,
          amount,
          status: WithdrawalStatus.PENDING,
          bankName,
          bankAccount,
          note: dto.note?.trim() || null,
          reviewedAt: null,
          processedAt: null,
        });

        return withdrawalRepository.save(request);
      });
    }, 'Không thể tạo yêu cầu rút tiền');
  }

  async getSystemWallet(): Promise<WalletResponse> {
    return asyncHandleOperation(async () => {
      const wallet = await this.getOrCreateSystemWallet(
        this.dataSource.manager,
      );

      return this.mapWallet(wallet);
    }, 'Không thể lấy ví hệ thống');
  }

  async getMyTaskerTransactions(
    userId: string,
    opts: WalletTransactionQueryOpts = {},
  ): Promise<WalletTransactionListResponse> {
    return asyncHandleOperation(async () => {
      const tasker = await this.findTaskerByUserId(
        this.dataSource.manager,
        userId,
      );
      const wallet = await this.getOrCreateTaskerWallet(
        this.dataSource.manager,
        tasker,
      );

      return this.getTransactionsByWalletId(wallet.id, opts);
    }, 'Không thể lấy lịch sử ví tasker');
  }

  async getMyCustomerTransactions(
    userId: string,
    opts: WalletTransactionQueryOpts = {},
  ): Promise<WalletTransactionListResponse> {
    return asyncHandleOperation(async () => {
      const customer = await this.findCustomerByUserId(
        this.dataSource.manager,
        userId,
      );
      const wallet = await this.getOrCreateCustomerWallet(
        this.dataSource.manager,
        customer,
      );

      return this.getTransactionsByWalletId(wallet.id, opts);
    }, 'Không thể lấy lịch sử ví customer');
  }

  async getSystemTransactions(): Promise<WalletTransactionListResponse> {
    return asyncHandleOperation(async () => {
      const wallet = await this.getOrCreateSystemWallet(
        this.dataSource.manager,
      );

      return this.getTransactionsByWalletId(wallet.id);
    }, 'Không thể lấy lịch sử ví hệ thống');
  }

  async getOrCreateTaskerWallet(
    manager: EntityManager,
    tasker: TaskerEntity,
  ): Promise<WalletEntity> {
    const walletRepository = manager.getRepository(WalletEntity);
    const existingWallet = await walletRepository.findOne({
      where: { tasker: { id: tasker.id }, ownerType: WalletOwnerType.TASKER },
      relations: ['tasker'],
    });

    if (existingWallet) {
      return existingWallet;
    }

    const wallet = await walletRepository.save(
      walletRepository.create({
        ownerType: WalletOwnerType.TASKER,
        tasker,
        balance: 0,
        holdBalance: 0,
      }),
    );

    return wallet;
  }

  async getOrCreateCustomerWallet(
    manager: EntityManager,
    customer: CustomerEntity,
  ): Promise<WalletEntity> {
    const walletRepository = manager.getRepository(WalletEntity);
    const existingWallet = await walletRepository.findOne({
      where: {
        customer: { id: customer.id },
        ownerType: WalletOwnerType.CUSTOMER,
      },
      relations: ['customer'],
    });

    if (existingWallet) {
      return existingWallet;
    }

    return walletRepository.save(
      walletRepository.create({
        ownerType: WalletOwnerType.CUSTOMER,
        customer,
        balance: 0,
        holdBalance: 0,
      }),
    );
  }

  async getOrCreateSystemWallet(manager: EntityManager): Promise<WalletEntity> {
    const walletRepository = manager.getRepository(WalletEntity);
    const existingWallet = await walletRepository.findOne({
      where: { ownerType: WalletOwnerType.SYSTEM },
    });

    if (existingWallet) {
      return existingWallet;
    }

    return walletRepository.save(
      walletRepository.create({
        ownerType: WalletOwnerType.SYSTEM,
        balance: 0,
        holdBalance: 0,
      }),
    );
  }

  async creditWallet(
    manager: EntityManager,
    input: WalletMutationInput,
  ): Promise<WalletEntity> {
    return this.applyBalanceChange(manager, input, input.amount);
  }

  async debitWallet(
    manager: EntityManager,
    input: WalletMutationInput,
  ): Promise<WalletEntity> {
    return this.applyBalanceChange(manager, input, -input.amount);
  }

  async transfer(
    manager: EntityManager,
    input: WalletTransferInput,
  ): Promise<void> {
    await this.debitWallet(manager, {
      wallet: input.fromWallet,
      amount: input.amount,
      type: input.debitType,
      booking: input.booking,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
      description: input.description,
    });
    await this.creditWallet(manager, {
      wallet: input.toWallet,
      amount: input.amount,
      type: input.creditType,
      booking: input.booking,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
      description: input.description,
    });
  }

  async recordPlatformIncome(
    manager: EntityManager,
    amount: number,
    booking?: BookingEntity | null,
    description?: string | null,
  ): Promise<WalletEntity> {
    const systemWallet = await this.getOrCreateSystemWallet(manager);
    return this.creditWallet(manager, {
      wallet: systemWallet,
      amount,
      type: WalletTransactionType.PLATFORM_FEE,
      booking,
      description,
    });
  }

  async recordPlatformExpense(
    manager: EntityManager,
    amount: number,
    booking?: BookingEntity | null,
    description?: string | null,
  ): Promise<WalletEntity> {
    const systemWallet = await this.getOrCreateSystemWallet(manager);
    return this.debitWallet(manager, {
      wallet: systemWallet,
      amount,
      type: WalletTransactionType.ADJUSTMENT,
      booking,
      description,
    });
  }

  private async applyBalanceChange(
    manager: EntityManager,
    input: WalletMutationInput,
    signedAmount: number,
  ): Promise<WalletEntity> {
    const amount = this.normalizeAmount(input.amount);
    const balanceChange = signedAmount < 0 ? -amount : amount;
    const wallet = await this.lockWallet(manager, input.wallet.id);
    const balanceBefore = toNumber(wallet.balance);
    const balanceAfter = balanceBefore + balanceChange;

    if (balanceAfter < 0) {
      throw new BadRequestException('Số dư ví không đủ');
    }

    wallet.balance = balanceAfter;
    const savedWallet = await manager.getRepository(WalletEntity).save(wallet);
    await this.createTransaction(manager, {
      wallet: savedWallet,
      type: input.type,
      amount,
      balanceBefore,
      balanceAfter,
      booking: input.booking,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
      description: input.description,
    });

    return savedWallet;
  }

  private async lockWallet(
    manager: EntityManager,
    walletId: string,
  ): Promise<WalletEntity> {
    const wallet = await manager.getRepository(WalletEntity).findOne({
      where: { id: walletId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!wallet) {
      throw new NotFoundException('Không tìm thấy ví');
    }

    return wallet;
  }

  private createTransaction(
    manager: EntityManager,
    input: {
      wallet: WalletEntity;
      type: WalletTransactionType;
      amount: number;
      balanceBefore: number;
      balanceAfter: number;
      booking?: BookingEntity | null;
      referenceId?: string | null;
      referenceType?: string | null;
      description?: string | null;
    },
  ): Promise<WalletTransactionEntity> {
    const transactionRepository = manager.getRepository(
      WalletTransactionEntity,
    );
    const transaction = transactionRepository.create({
      wallet: input.wallet,
      type: input.type,
      amount: input.amount,
      balanceBefore: input.balanceBefore,
      balanceAfter: input.balanceAfter,
      booking: input.booking,
      referenceId: input.referenceId ?? input.booking?.id ?? null,
      referenceType: input.referenceType ?? (input.booking ? 'BOOKING' : null),
      description: input.description,
    });

    return transactionRepository.save(transaction);
  }

  private async getTransactionsByWalletId(
    walletId: string,
    opts: WalletTransactionQueryOpts = {},
  ): Promise<WalletTransactionListResponse> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 10));
    const skip = (page - 1) * limit;

    const qb = this.dataSource
      .getRepository(WalletTransactionEntity)
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.wallet', 'wallet')
      .leftJoinAndSelect('tx.booking', 'booking')
      .where('tx.wallet_id = :walletId', { walletId })
      .orderBy('tx.created_at', 'DESC');

    if (opts.fromDate) {
      qb.andWhere('tx.created_at >= :fromDate', {
        fromDate: new Date(opts.fromDate),
      });
    }
    if (opts.toDate) {
      // toDate bao gồm cả ngày đó (lấy đến cuối ngày)
      const to = new Date(opts.toDate);
      to.setHours(23, 59, 59, 999);
      qb.andWhere('tx.created_at <= :toDate', { toDate: to });
    }

    const total = await qb.getCount();
    const transactions = await qb.clone().skip(skip).take(limit).getMany();

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items: transactions.map((tx) => this.mapTransaction(tx)),
    };
  }

  private async findTaskerByUserId(
    manager: EntityManager,
    userId: string,
  ): Promise<TaskerEntity> {
    const tasker = await manager.getRepository(TaskerEntity).findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!tasker) {
      throw new NotFoundException('Không tìm thấy hồ sơ tasker');
    }

    return tasker;
  }

  private async findCustomerByUserId(
    manager: EntityManager,
    userId: string,
  ): Promise<CustomerEntity> {
    const customer = await manager.getRepository(CustomerEntity).findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!customer) {
      throw new NotFoundException('Không tìm thấy hồ sơ customer');
    }

    return customer;
  }

  private normalizeAmount(amount: number): number {
    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      throw new BadRequestException('Số tiền giao dịch không hợp lệ');
    }

    return normalizedAmount;
  }

  private mapWallet(wallet: WalletEntity): WalletResponse {
    return {
      id: wallet.id,
      ownerType: wallet.ownerType,
      balance: toNumber(wallet.balance),
      holdBalance: toNumber(wallet.holdBalance),
      taskerId: wallet.tasker?.id ?? null,
      customerId: wallet.customer?.id ?? null,
      requiredDeposit: wallet.tasker
        ? toNumber(wallet.tasker.depositAmount)
        : undefined,
      currentDepositBalance: wallet.tasker
        ? toNumber(wallet.tasker.currentDepositBalance)
        : undefined,
      depositTopupDue: wallet.tasker?.depositTopupDue ?? null,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  private mapTransaction(
    transaction: WalletTransactionEntity,
  ): WalletTransactionResponse {
    return {
      id: transaction.id,
      walletId: transaction.wallet.id,
      bookingId: transaction.booking?.id ?? null,
      referenceId: transaction.referenceId,
      referenceType: transaction.referenceType,
      type: transaction.type,
      amount: toNumber(transaction.amount),
      balanceBefore: toNumber(transaction.balanceBefore),
      balanceAfter: toNumber(transaction.balanceAfter),
      description: transaction.description,
      createdAt: transaction.createdAt,
    };
  }
}
