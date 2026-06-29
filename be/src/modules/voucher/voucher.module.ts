import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VouchersService } from './services/vouchers.service';
import { VoucherEntity } from './entity/voucher.entity';
import { CustomerVoucherEntity } from './entity/customer-voucher.entity';
import { VouchersController } from './vouchers.controller';
import { CustomerVouchersController } from './customer-vouchers.controller';
import {
  CustomerVoucherRepository,
  VoucherRepository,
} from './voucher.repository';

@Module({
  imports: [TypeOrmModule.forFeature([VoucherEntity, CustomerVoucherEntity])],
  controllers: [VouchersController, CustomerVouchersController],
  providers: [VouchersService, VoucherRepository, CustomerVoucherRepository],
  exports: [VouchersService],
})
export class VoucherModule {}
