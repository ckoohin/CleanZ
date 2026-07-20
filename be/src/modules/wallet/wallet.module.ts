import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletTransactionEntity } from './entity/wallet-transaction.entity';
import { WalletEntity } from './entity/wallet.entity';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { WithdrawalRequestEntity } from '../finance/entity/withdrawal-request.entity';
import { TaskerDepositTransactionEntity } from './entity/tasker-deposit-transaction.entity';
import { TaskerBalanceService } from './tasker-balance.service';
import { CustomerWithdrawalRequestEntity } from './entity/customer-withdrawal-request.entity';
import { CustomerWithdrawalService } from './customer-withdrawal.service';
import { CustomerWithdrawalController } from './customer-withdrawal.controller';
import { WalletTopupOrderEntity } from './entity/wallet-topup-order.entity';
import { WalletTopupService } from './wallet-topup.service';
import { PaypalService } from './paypal.service';
import { AdyenService } from './adyen.service';
import { SystemConfigModule } from '../system-config/system-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WalletEntity,
      WalletTransactionEntity,
      WithdrawalRequestEntity,
      TaskerDepositTransactionEntity,
      CustomerWithdrawalRequestEntity,
      WalletTopupOrderEntity,
    ]),
    SystemConfigModule,
  ],
  controllers: [WalletController, CustomerWithdrawalController],
  providers: [
    WalletService,
    TaskerBalanceService,
    CustomerWithdrawalService,
    WalletTopupService,
    PaypalService,
    AdyenService,
  ],
  exports: [
    TypeOrmModule,
    WalletService,
    TaskerBalanceService,
    WalletTopupService,
    AdyenService,
  ],
})
export class WalletModule {}
