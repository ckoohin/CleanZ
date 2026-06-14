import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IncidentEntity } from './entity/incident.entity';

@Module({
  imports: [TypeOrmModule.forFeature([IncidentEntity])],
  exports: [TypeOrmModule],
})
export class IncidentModule {}
