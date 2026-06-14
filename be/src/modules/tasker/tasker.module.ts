import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskerEntity } from './entity/tasker.entity';
import { TaskerService } from './tasker.service';
import { TaskerController } from './tasker.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TaskerEntity])],
  controllers: [TaskerController],
  providers: [TaskerService],
})
export class TaskerModule {}
