import { NotificationType } from 'src/common/enums/notification-type.enum';
import { NotificationRefType } from 'src/common/enums/notification-ref-type.enum';
import { NotificationEntity } from '../entity/notification.entity';

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  referenceType: NotificationRefType | null;
  referenceId: string | null;
  title: string;
  content: string | null;
  isRead: boolean;
  createdAt: Date;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedNotifications {
  data: NotificationResponse[];
  meta: PaginationMeta;
}

export function toNotificationResponse(
  n: NotificationEntity,
): NotificationResponse {
  return {
    id: n.id,
    type: n.type,
    referenceType: n.referenceType ?? null,
    referenceId: n.referenceId ?? null,
    title: n.title,
    content: n.content ?? null,
    isRead: n.isRead,
    createdAt: n.createdAt,
  };
}
