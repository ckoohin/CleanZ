import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Policy } from './entity/policy.entity';
import { PolicyController } from './policy.controller';
import { PolicyService } from './policy.service';
import { ServicePackageEntity } from '../service/entity/service-package.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Policy, ServicePackageEntity])],
  controllers: [PolicyController],
  providers: [PolicyService],
  exports: [PolicyService],
})
export class PolicyModule {}

