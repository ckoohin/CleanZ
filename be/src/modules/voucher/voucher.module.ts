import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoucherEntity } from './entity/voucher.entity';
import { VouchersService } from './services/vouchers.service';

@Module({
  imports: [TypeOrmModule.forFeature([VoucherEntity])],
  providers: [VouchersService],
  exports: [TypeOrmModule, VouchersService],
})
export class VoucherModule {}
