import { Injectable } from '@nestjs/common';
import { NotificationService } from '../notification.service';
import { NotificationGateway } from '../notification.gateway';
import { NotifyInput } from '../types/notify-input.interface';
import { NotificationEntity } from '../entity/notification.entity';
import { toNotificationResponse } from '../dto/notification-response.dto';

@Injectable()
export class InAppChannel {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly gateway: NotificationGateway,
  ) {}

  async send(input: NotifyInput): Promise<NotificationEntity> {
    const { notification, created } =
      await this.notificationService.createInApp(input);

    if (created) {
      this.gateway.emitNewNotification(
        input.userId,
        toNotificationResponse(notification),
      );
      await this.notificationService.emitUnreadCount(input.userId);
    }

    return notification;
  }
}
