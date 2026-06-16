import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricingConfigEntity } from './entity/pricing-config.entity';
import { ServiceEntity } from './entity/service.entity';
import { PricingService } from './pricing.service';
import { SystemConfigModule } from '../system-config/system-config.module';
import { VoucherModule } from '../voucher/voucher.module';

@Module({
  imports: [
    SystemConfigModule,
    VoucherModule,
    TypeOrmModule.forFeature([PricingConfigEntity, ServiceEntity]),
  ],
  providers: [PricingService],
  exports: [TypeOrmModule, PricingService],
})
export class PricingModule {}
