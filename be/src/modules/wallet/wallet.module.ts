import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletTransactionEntity } from './entity/wallet-transaction.entity';
import { WalletEntity } from './entity/wallet.entity';
import { WalletTopupEntity } from './entity/wallet-topup.entity';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { WalletTopupService } from './wallet-topup.service';
import { WithdrawalRequestEntity } from '../finance/entity/withdrawal-request.entity';
import { SystemConfigModule } from '../system-config/system-config.module';
import { PAYMENT_GATEWAY } from './gateways/payment-gateway.interface';
import { PayPalGateway } from './gateways/paypal.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WalletEntity,
      WalletTransactionEntity,
      WalletTopupEntity,
      WithdrawalRequestEntity,
    ]),
    SystemConfigModule,
  ],
  controllers: [WalletController],
  providers: [
    WalletService,
    WalletTopupService,
    { provide: PAYMENT_GATEWAY, useClass: PayPalGateway },
  ],
  exports: [TypeOrmModule, WalletService],
})
export class WalletModule {}
