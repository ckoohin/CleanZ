import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricingConfigEntity } from './entity/pricing-config.entity';
import { PeakDayConfigEntity } from './entity/peak-day-config.entity';
import {
  PricingConfigRepository,
  PeakDayConfigRepository,
} from './pricing.repository';
import { PricingService } from './services/pricing.service';
import { ServicesModule } from '../service/services.module';
import { PricingController } from './pricing.controller';
import { SystemConfigModule } from '../system-config/system-config.module';
import { VoucherModule } from '../voucher/voucher.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PricingConfigEntity, PeakDayConfigEntity]),
    ServicesModule,
    SystemConfigModule,
    VoucherModule,
  ],
  controllers: [PricingController],
  providers: [PricingService, PricingConfigRepository, PeakDayConfigRepository],
  exports: [PricingService],
})
export class PricingModule {}
