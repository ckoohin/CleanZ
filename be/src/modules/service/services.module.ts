import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricingConfigEntity } from '../pricing/entity/pricing-config.entity';
import { ServicePackageEntity } from './entity/service-package.entity';
import { SubServiceEntity } from './entity/sub-service.entity';
import { PackageSubServiceEntity } from './entity/package-sub-service.entity';
import { CoverageAreaEntity } from './entity/coverage-area.entity';
import { ServiceDurationEntity } from './entity/service-duration.entity';
import { ServiceAddonEntity } from './entity/service-addon.entity';
import { ServiceSubscriptionEntity } from './entity/service-subscription.entity';
import { ServicePeakHourEntity } from './entity/service-peak-hour.entity';
import { ServiceSubServiceEntity } from './entity/service-sub-service.entity';
import { ServiceRepository } from './service.repository';
import { SubServicesService } from './services/sub-services.service';
import { SubServicesController } from './sub-services.controller';
import { PublicServicesController } from './public-services.controller';
import { ServicePackagesService } from './services/service-packages.service';
import { ServicePackagesController } from './service-packages.controller';
import { CoverageAreasService } from './services/coverage-areas.service';
import { CoverageAreasController } from './coverage-areas.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PricingConfigEntity,
      ServicePackageEntity,
      SubServiceEntity,
      PackageSubServiceEntity,
      CoverageAreaEntity,
      ServiceDurationEntity,
      ServiceAddonEntity,
      ServiceSubscriptionEntity,
      ServicePeakHourEntity,
      ServiceSubServiceEntity,
    ]),
  ],
  controllers: [
    SubServicesController,
    PublicServicesController,
    ServicePackagesController,
    CoverageAreasController,
  ],
  providers: [
    SubServicesService,
    ServiceRepository,
    ServicePackagesService,
    CoverageAreasService,
  ],
  exports: [
    SubServicesService,
    ServiceRepository,
    ServicePackagesService,
    CoverageAreasService,
  ],
})
export class ServicesModule {}
