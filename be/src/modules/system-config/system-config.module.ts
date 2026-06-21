import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PeakDayConfigEntity } from '../pricing/entity/peak-day-config.entity';
import { SystemConfigEntity } from './entity/system-config.entity';
import { SystemConfigService } from './system-config.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemConfigEntity, PeakDayConfigEntity]),
  ],
  providers: [SystemConfigService],
  exports: [TypeOrmModule, SystemConfigService],
})
export class SystemConfigModule {}
