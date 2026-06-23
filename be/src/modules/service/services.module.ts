import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicePackageEntity } from './entity/service-package.entity';
import { SubServiceEntity } from './entity/sub-service.entity';
import { PackageSubServiceEntity } from './entity/package-sub-service.entity';
import { CoverageAreaEntity } from './entity/coverage-area.entity';
import { ServiceRepository } from './service.repository';
import { SubServicesService } from './services/sub-services.service';
import { SubServicesController } from './sub-services.controller';
import { PublicServicesController } from './public-services.controller';
import { ServicePackagesService } from './services/service-packages.service';
import { ServicePackagesController } from './service-packages.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServicePackageEntity,
      SubServiceEntity,
      PackageSubServiceEntity,
      CoverageAreaEntity,
    ]),
  ],
  controllers: [
    SubServicesController,
    PublicServicesController,
    ServicePackagesController,
  ],
  providers: [SubServicesService, ServiceRepository, ServicePackagesService],
  exports: [SubServicesService, ServiceRepository, ServicePackagesService],
})
export class ServicesModule {}
