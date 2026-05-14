import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffsController } from './staffs.controller';
import { StaffsService } from './staffs.service';
import { StaffUploadService } from './staff-upload.service';
import { StaffEntity } from './entities/staff.entity';
import { User } from '../users/entities/user.entity';
import { StaffDocumentEntity } from './entities/staff-document.entity';
import { StaffServiceEntity } from './entities/staff-service.entity';
import { ServiceEntity } from '../services/entities/service.entity';
import { UploadModule } from '../upload/upload.module';
import { StaffPresenceEntity } from './entities/staff-presence.entity';
import { MailService } from '../mail/mail.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StaffEntity,
      User,
      StaffDocumentEntity,
      StaffPresenceEntity,
      StaffServiceEntity,
      ServiceEntity,
    ]),
    UploadModule,
  ],
  controllers: [StaffsController],
  providers: [StaffsService, StaffUploadService, MailService],
  exports: [StaffsService],
})
export class StaffsModule {}
