import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricingConfigEntity } from './entity/pricing-config.entity';
import { PeakDayConfigEntity } from './entity/peak-day-config.entity';
import { PricingTierEntity } from './entity/pricing-tier.entity';
import {
  PricingConfigRepository,
  PeakDayConfigRepository,
  PricingTierRepository,
} from './pricing.repository';
import { PricingService } from './services/pricing.service';
import { PricingTierService } from './services/pricing-tier.service';
import { ServicesModule } from '../service/services.module';
import { PricingController } from './pricing.controller';
import { SystemConfigModule } from '../system-config/system-config.module';
import { VoucherModule } from '../voucher/voucher.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PricingConfigEntity,
      PeakDayConfigEntity,
      PricingTierEntity,
    ]),
    ServicesModule,
    SystemConfigModule,
    VoucherModule,
  ],
  controllers: [PricingController],
  providers: [
    PricingService,
    PricingTierService,
    PricingConfigRepository,
    PeakDayConfigRepository,
    PricingTierRepository,
  ],
  exports: [PricingService, PricingTierService],
})
export class PricingModule {}
