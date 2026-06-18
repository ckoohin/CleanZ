import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceEntity } from './entity/service.entity';
import { ServiceRepository } from './service.repository';
import { ServicesService } from './services/services.service';
import { ServicesController } from './services.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceEntity])],
  controllers: [ServicesController],
  providers: [ServicesService, ServiceRepository],
  exports: [ServicesService, ServiceRepository],
})
export class ServicesModule {}
