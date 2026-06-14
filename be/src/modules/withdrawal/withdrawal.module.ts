import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WithdrawalEntity } from './entity/withdrawal.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WithdrawalEntity])],
  exports: [TypeOrmModule],
})
export class WithdrawalModule {}
