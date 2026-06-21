import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { MailModule } from 'src/modules/mail/mail.module';
import { EmailChannel } from './channels/email.channel';
import { NotificationEntity } from './entity/notification.entity';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationAdminController } from './notification-admin.controller';
import { NotificationProcessor } from './notification.processor';
import { NotificationGateway } from './notification.gateway';
import { ChannelResolverService } from './channels/channel-resolver.service';
import { InAppChannel } from './channels/in-app.channel';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { NOTIFICATION_QUEUE } from './notification.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity, UserEntity]),
    BullModule.registerQueue({ name: NOTIFICATION_QUEUE }),
    JwtModule.register({}),
    MailModule,
  ],
  controllers: [NotificationController, NotificationAdminController],
  providers: [
    NotificationService,
    ChannelResolverService,
    InAppChannel,
    EmailChannel,
    NotificationProcessor,
    NotificationGateway,
    WsJwtGuard,
  ],
  exports: [NotificationService, TypeOrmModule],
})
export class NotificationModule {}
