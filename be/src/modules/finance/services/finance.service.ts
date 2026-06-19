import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  WalletRepository,
  WalletTransactionRepository,
  WithdrawalRequestRepository,
} from '../finance.repository';
import { WithdrawalRequestEntity } from '../entity/withdrawal-request.entity';
import { WalletTransactionEntity } from '../../wallet/entity/wallet-transaction.entity';
import { WalletEntity } from '../../wallet/entity/wallet.entity';
import { PaginatedData } from '../../../common/helpers/response.interface';
import { WalletTransactionType } from '../../../common/enums/wallet-transaction-type.enum';
import { WithdrawalListQueryDto } from '../dto/with-drawal-list-query.dto';
import { ReviewWithdrawalDto } from '../dto/review-with-drawal.dto';
import { WithdrawalStatus } from 'src/common/enums/with-drawal-status.enum';
import { RevenueQueryDto } from '../dto/revenue-query.dto';
import { RevenueSummaryResponseDto } from '../dto/revenue-summary-response.dto';
import { WalletTransactionListQueryDto } from 'src/modules/wallet/dto/wallet-transaction-list-query.dto';
import { ManualAdjustmentDto } from '../dto/manual-adjustment.dto';

const MAX_WEEKLY_WITHDRAWALS = 2;

@Injectable()
export class FinanceService {
  constructor(
    private readonly walletRepo: WalletRepository,
    private readonly transactionRepo: WalletTransactionRepository,
    private readonly withdrawalRepo: WithdrawalRequestRepository,
    private readonly dataSource: DataSource,
  ) {}

  async findAllWithdrawals(
    query: WithdrawalListQueryDto,
  ): Promise<PaginatedData<WithdrawalRequestEntity>> {
    return this.withdrawalRepo.findWithPagination(query);
  }

  async findOneWithdrawal(id: string): Promise<WithdrawalRequestEntity> {
    const wr = await this.withdrawalRepo.findOne({
      where: { id },
      relations: ['wallet'],
    });
    if (!wr) throw new NotFoundException('WITHDRAWAL_NOT_FOUND');
    return wr;
  }

  async reviewWithdrawal(
    id: string,
    dto: ReviewWithdrawalDto,
    reviewerUserId: string,
  ): Promise<WithdrawalRequestEntity> {
    const withdrawal = await this.findOneWithdrawal(id);

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new ConflictException(
        `WITHDRAWAL_NOT_PENDING: Cannot review a request with status "${withdrawal.status}"`,
      );
    }

    if (!withdrawal.taskerId) {
      throw new BadRequestException('WITHDRAWAL_TASKER_NOT_FOUND');
    }

    const weeklyCount = await this.withdrawalRepo.countWeeklyWithdrawals(
      withdrawal.taskerId,
    );
    if (
      dto.status === WithdrawalStatus.APPROVED &&
      weeklyCount >= MAX_WEEKLY_WITHDRAWALS
    ) {
      throw new BadRequestException(
        `WEEKLY_LIMIT_EXCEEDED: Tasker has already reached ${MAX_WEEKLY_WITHDRAWALS} withdrawals this week`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (dto.status === WithdrawalStatus.APPROVED) {
        const wallet = withdrawal.wallet;

        if (wallet.balance < withdrawal.amount) {
          throw new BadRequestException(
            'INSUFFICIENT_BALANCE: Wallet balance is lower than requested withdrawal amount',
          );
        }

        const balanceBefore = Number(wallet.balance);
        const balanceAfter = balanceBefore - Number(withdrawal.amount);

        await queryRunner.manager.update(WalletEntity, wallet.id, {
          balance: balanceAfter,
        });

        const tx = queryRunner.manager.create(WalletTransactionEntity, {
          walletId: wallet.id,
          type: WalletTransactionType.WITHDRAW,
          amount: -withdrawal.amount,
          balanceBefore,
          balanceAfter,
          referenceId: withdrawal.id,
          referenceType: 'WITHDRAWAL_REQUEST',
          description: `Rút tiền về ${withdrawal.bankName ?? 'tài khoản'} - ${withdrawal.bankAccount ?? ''}`,
        });
        await queryRunner.manager.save(WalletTransactionEntity, tx);
      }

      await queryRunner.manager.update(WithdrawalRequestEntity, id, {
        status: dto.status,
        note: dto.note ?? withdrawal.note,
        reviewedAt: new Date(),
        ...(dto.status === WithdrawalStatus.APPROVED
          ? { processedAt: new Date() }
          : {}),
      });

      await queryRunner.commitTransaction();

      return this.findOneWithdrawal(id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getRevenueSummary(
    query: RevenueQueryDto,
  ): Promise<RevenueSummaryResponseDto[]> {
    return this.transactionRepo.getRevenueSummary(query);
  }

  async getFinancialOverview(): Promise<{
    totalWalletBalance: number;
    totalHoldBalance: number;
    pendingWithdrawals: number;
    pendingWithdrawalAmount: number;
  }> {
    const [balanceResult] = await this.dataSource.query<
      [{ totalBalance: string; totalHold: string }]
    >(
      `SELECT
         COALESCE(SUM(balance), 0)::numeric AS "totalBalance",
         COALESCE(SUM(hold_balance), 0)::numeric AS "totalHold"
       FROM wallets`,
    );

    const [withdrawResult] = await this.dataSource.query<
      [{ count: string; totalAmount: string }]
    >(
      `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS "totalAmount"
       FROM tasker_withdrawal_requests
       WHERE status = 'PENDING'`,
    );

    return {
      totalWalletBalance: parseFloat(balanceResult.totalBalance),
      totalHoldBalance: parseFloat(balanceResult.totalHold),
      pendingWithdrawals: parseInt(withdrawResult.count, 10),
      pendingWithdrawalAmount: parseFloat(withdrawResult.totalAmount),
    };
  }

  async findAllTransactions(
    query: WalletTransactionListQueryDto,
  ): Promise<PaginatedData<WalletTransactionEntity>> {
    return this.transactionRepo.findWithPagination(query);
  }

  async createManualAdjustment(
    dto: ManualAdjustmentDto,
    adminUserId: string,
  ): Promise<WalletTransactionEntity> {
    const wallet = await this.walletRepo.findOne({
      where: { id: dto.walletId },
    });
    if (!wallet) throw new NotFoundException('WALLET_NOT_FOUND');

    const balanceBefore = Number(wallet.balance);
    const newBalance = balanceBefore + Number(dto.amount);

    if (newBalance < 0) {
      throw new BadRequestException(
        'INSUFFICIENT_BALANCE: Adjustment would result in negative balance',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.update(WalletEntity, wallet.id, {
        balance: newBalance,
      });

      const tx = queryRunner.manager.create(WalletTransactionEntity, {
        walletId: wallet.id,
        type: dto.type,
        amount: dto.amount,
        balanceBefore,
        balanceAfter: newBalance,
        referenceId: adminUserId,
        referenceType: 'ADMIN_ADJUSTMENT',
        description: dto.description,
      });

      const saved = await queryRunner.manager.save(WalletTransactionEntity, tx);
      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getWalletById(id: string): Promise<WalletEntity> {
    const wallet = await this.walletRepo.findOne({ where: { id } });
    if (!wallet) throw new NotFoundException('WALLET_NOT_FOUND');
    return wallet;
  }
}
