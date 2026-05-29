import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { StaffUploadService } from './staff-upload.service';
import { StaffEntity } from './entities/staff.entity';
import { User } from '../users/entities/user.entity';
import { StaffDocumentEntity } from './entities/staff-document.entity';
import { StaffServiceEntity } from './entities/staff-service.entity';
import { ServiceEntity } from '../services/entities/service.entity';
import { UploadModule } from '../upload/upload.module';
import { StaffPresenceEntity } from './entities/staff-presence.entity';
import { StaffPenaltyEntity } from './entities/staff-penalty.entity';
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
      StaffPenaltyEntity,
    ]),
    UploadModule,
  ],
  controllers: [StaffController],
  providers: [StaffService, StaffUploadService, MailService],
  exports: [StaffService],
})
export class StaffModule {}
