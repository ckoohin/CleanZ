import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletEntity } from '../wallet/entity/wallet.entity';
import { WalletTransactionEntity } from '../wallet/entity/wallet-transaction.entity';
import { WithdrawalRequestEntity } from './entity/withdrawal-request.entity';
import { FinanceController } from './finance.controller';
import { FinanceService } from './services/finance.service';
import {
  WalletRepository,
  WalletTransactionRepository,
  WithdrawalRequestRepository,
} from './finance.repository';
import { WalletModule } from '../wallet/wallet.module';
import { AdminActivityModule } from '../admin/admin-activity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WalletEntity,
      WalletTransactionEntity,
      WithdrawalRequestEntity,
    ]),
    WalletModule,
    AdminActivityModule,
  ],
  controllers: [FinanceController],
  providers: [
    FinanceService,
    WalletRepository,
    WalletTransactionRepository,
    WithdrawalRequestRepository,
  ],
  exports: [FinanceService, WalletRepository],
})
export class FinanceModule {}
