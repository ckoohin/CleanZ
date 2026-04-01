import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkersController } from './workers.controller';
import { WorkersService } from './workers.service';
import { WorkerEntity } from './entities/worker.entity';
import { User } from '../users/entities/user.entity';
import { WorkerDocumentEntity } from './entities/worker-document.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkerEntity, User, WorkerDocumentEntity]),
  ],
  controllers: [WorkersController],
  providers: [WorkersService],
})
export class WorkersModule {}
