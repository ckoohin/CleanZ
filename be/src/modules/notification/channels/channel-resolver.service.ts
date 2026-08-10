import { Injectable } from '@nestjs/common';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import {
  NotificationChannel,
  NotifyInput,
} from '../types/notify-input.interface';

const CHANNEL_MATRIX: Record<NotificationType, NotificationChannel[]> = {
  // Chỉ in-app — tasker nhận ngay qua socket khi đang online
  [NotificationType.BOOKING_NEW_AVAILABLE]: ['IN_APP'],
  [NotificationType.BOOKING_CONFIRMED]: ['IN_APP', 'EMAIL'],
  [NotificationType.TASKER_ON_THE_WAY]: ['IN_APP', 'EMAIL'],
  [NotificationType.BOOKING_COMPLETED]: ['IN_APP', 'EMAIL'],
  [NotificationType.BOOKING_CANCELLED]: ['IN_APP', 'EMAIL'],
  [NotificationType.PAYMENT_SUCCESS]: ['IN_APP', 'EMAIL'],
  [NotificationType.PAYMENT_FAILED]: ['IN_APP', 'EMAIL'],
  [NotificationType.INCIDENT_UPDATE]: ['IN_APP', 'EMAIL'],
  // Hỗ trợ / tin nhắn ticket: CHỈ in-app (không gửi email khi nhắn tin).
  [NotificationType.SUPPORT_REPLY]: ['IN_APP'],
  [NotificationType.PROMOTION]: ['IN_APP'],
  [NotificationType.SYSTEM]: ['IN_APP'],
  [NotificationType.BOOKING_PENDING_CONFIRMATION]: ['IN_APP'],
  [NotificationType.BOOKING_SURCHARGE_PENDING]: ['IN_APP', 'EMAIL'],
  // Cửa sổ chờ chỉ 20 phút nên email vô nghĩa — chỉ in-app + socket realtime.
  [NotificationType.BOOKING_OVERTIME_REQUEST]: ['IN_APP'],
  [NotificationType.BOOKING_OVERTIME_APPROVED]: ['IN_APP'],
  [NotificationType.BOOKING_OVERTIME_REJECTED]: ['IN_APP'],
  [NotificationType.BOOKING_SURCHARGE_AWAITING_RECEIPT]: ['IN_APP'],
  [NotificationType.BOOKING_SURCHARGE_DISPUTED]: ['IN_APP', 'EMAIL'],
  [NotificationType.BOOKING_ABSENCE_REPORTED]: ['IN_APP', 'EMAIL'],
  [NotificationType.BOOKING_ABSENCE_APPROVED]: ['IN_APP', 'EMAIL'],
  [NotificationType.BOOKING_ABSENCE_REJECTED]: ['IN_APP', 'EMAIL'],
  [NotificationType.BOOKING_ABSENCE_EXPIRED]: ['IN_APP', 'EMAIL'],
};

@Injectable()
export class ChannelResolverService {
  resolve(input: NotifyInput): NotificationChannel[] {
    return input.channels ?? CHANNEL_MATRIX[input.type] ?? ['IN_APP'];
  }
}
