import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskerEntity } from './entity/tasker.entity';
import { TaskerService } from './tasker.service';
import { TaskerController } from './tasker.controller';
import { UploadModule } from '../upload/upload.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([TaskerEntity]), UploadModule, MailModule],
  controllers: [TaskerController],
  providers: [TaskerService],
})
export class TaskerModule {}
