import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkersController } from './workers.controller';
import { WorkersService } from './workers.service';
import { WorkerEntity } from './entities/worker.entity';
import { User } from '../users/entities/user.entity';
import { WorkerDocumentEntity } from './entities/worker-document.entity';
import { WorkerServiceEntity } from './entities/worker-service.entity';
import { ServiceEntity } from '../services/entities/service.entity';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkerEntity,
      User,
      WorkerDocumentEntity,
      WorkerServiceEntity,
      ServiceEntity,
    ]),
    UploadModule,
  ],
  controllers: [WorkersController],
  providers: [WorkersService],
  exports: [WorkersService],
})
export class WorkersModule {}

