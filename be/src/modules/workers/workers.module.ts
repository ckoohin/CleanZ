import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkersController } from './workers.controller';
import { WorkersService } from './workers.service';
import { WorkerUploadService } from './worker-upload.service';
import { WorkerEntity } from './entities/worker.entity';
import { User } from '../users/entities/user.entity';
import { WorkerDocumentEntity } from './entities/worker-document.entity';
import { UploadModule } from '../upload/upload.module';
import { WorkerPresenceEntity } from './entities/worker-presence.entity';
import { MailService } from '../mail/mail.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkerEntity,
      User,
      WorkerDocumentEntity,
      WorkerPresenceEntity,
    ]),
    UploadModule,
  ],
  controllers: [WorkersController],
  providers: [WorkersService, WorkerUploadService, MailService],
})
export class WorkersModule {}
