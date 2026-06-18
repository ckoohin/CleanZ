import { Injectable } from '@nestjs/common';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import {
  NotificationChannel,
  NotifyInput,
} from '../types/notify-input.interface';

const CHANNEL_MATRIX: Record<NotificationType, NotificationChannel[]> = {
  [NotificationType.BOOKING_CONFIRMED]: ['IN_APP', 'EMAIL'],
  [NotificationType.TASKER_ON_THE_WAY]: ['IN_APP', 'EMAIL'],
  [NotificationType.BOOKING_COMPLETED]: ['IN_APP', 'EMAIL'],
  [NotificationType.BOOKING_CANCELLED]: ['IN_APP', 'EMAIL'],
  [NotificationType.PAYMENT_SUCCESS]: ['IN_APP', 'EMAIL'],
  [NotificationType.PAYMENT_FAILED]: ['IN_APP', 'EMAIL'],
  [NotificationType.INCIDENT_UPDATE]: ['IN_APP', 'EMAIL'],
  [NotificationType.SUPPORT_REPLY]: ['IN_APP', 'EMAIL'],
  [NotificationType.PROMOTION]: ['IN_APP'],
  [NotificationType.SYSTEM]: ['IN_APP'],
};

@Injectable()
export class ChannelResolverService {
  resolve(input: NotifyInput): NotificationChannel[] {
    return input.channels ?? CHANNEL_MATRIX[input.type] ?? ['IN_APP'];
  }
}
