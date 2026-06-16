import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletTransactionEntity } from './entity/wallet-transaction.entity';
import { WalletEntity } from './entity/wallet.entity';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [TypeOrmModule.forFeature([WalletEntity, WalletTransactionEntity])],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [TypeOrmModule, WalletService],
})
export class WalletModule {}
