import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoucherEntity } from './entity/voucher.entity';
import { VoucherService } from './voucher.service';

@Module({
  imports: [TypeOrmModule.forFeature([VoucherEntity])],
  providers: [VoucherService],
  exports: [TypeOrmModule, VoucherService],
})
export class VoucherModule {}
