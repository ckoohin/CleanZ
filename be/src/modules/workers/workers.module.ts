import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkersController } from './workers.controller';
import { WorkersService } from './workers.service';
import { WorkerEntity } from './worker.entity';
import { User } from '../users/entities/user.entity';

@Module({
    imports: [TypeOrmModule.forFeature([WorkerEntity, User])],
    controllers: [WorkersController],
    providers: [WorkersService],
})
export class WorkersModule { }
