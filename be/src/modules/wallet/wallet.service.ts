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
  items: WalletTransactionResponse[];
}

@Injectable()
export class WalletService {
  constructor(private readonly dataSource: DataSource) {}

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

      return this.getTransactionsByWalletId(wallet.id);
    }, 'Không thể lấy lịch sử ví tasker');
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

    const initialBalance = toNumber(tasker.currentDepositBalance);
    const wallet = await walletRepository.save(
      walletRepository.create({
        ownerType: WalletOwnerType.TASKER,
        tasker,
        balance: initialBalance,
        holdBalance: 0,
      }),
    );

    if (initialBalance > 0) {
      await this.createTransaction(manager, {
        wallet,
        type: WalletTransactionType.ADJUSTMENT,
        amount: initialBalance,
        balanceBefore: 0,
        balanceAfter: initialBalance,
        description: 'Initial demo tasker wallet balance',
      });
    }

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
      referenceId: input.referenceId,
      referenceType: input.referenceType,
      description: input.description,
    });

    return transactionRepository.save(transaction);
  }

  private async getTransactionsByWalletId(
    walletId: string,
  ): Promise<WalletTransactionListResponse> {
    const transactionRepository = this.dataSource.getRepository(
      WalletTransactionEntity,
    );
    const [transactions, total] = await transactionRepository.findAndCount({
      where: { wallet: { id: walletId } },
      relations: ['wallet', 'booking'],
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return {
      total,
      items: transactions.map((transaction) =>
        this.mapTransaction(transaction),
      ),
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
