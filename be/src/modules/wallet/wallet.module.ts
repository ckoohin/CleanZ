import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletTransactionEntity } from './entity/wallet-transaction.entity';
import { WalletEntity } from './entity/wallet.entity';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { WithdrawalRequestEntity } from '../finance/entity/withdrawal-request.entity';
import { TaskerDepositTransactionEntity } from './entity/tasker-deposit-transaction.entity';
import { TaskerDepositService } from './tasker-deposit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WalletEntity,
      WalletTransactionEntity,
      WithdrawalRequestEntity,
      TaskerDepositTransactionEntity,
    ]),
  ],
  controllers: [WalletController],
  providers: [WalletService, TaskerDepositService],
  exports: [TypeOrmModule, WalletService, TaskerDepositService],
})
export class WalletModule {}
