import { NotificationType } from 'src/common/enums/notification-type.enum';
import { NotificationRefType } from 'src/common/enums/notification-ref-type.enum';

export type NotificationChannel = 'IN_APP' | 'EMAIL';

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  content?: string;
  referenceType?: NotificationRefType;
  referenceId?: string;
  channels?: NotificationChannel[];
  emailContext?: Record<string, unknown>;
  dedupeKey?: string;
}
