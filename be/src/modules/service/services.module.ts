import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceEntity } from './entity/service.entity';
import { CategoryEntity } from './entity/category.entity';
import { ServiceRepository } from './service.repository';
import { ServicesService } from './services/services.service';
import { ServicesController } from './services.controller';
import { CategoriesService } from './services/categories.service';
import { CategoriesController } from './categories.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceEntity, CategoryEntity])],
  controllers: [ServicesController, CategoriesController],
  providers: [ServicesService, ServiceRepository, CategoriesService],
  exports: [ServicesService, ServiceRepository, CategoriesService],
})
export class ServicesModule {}

