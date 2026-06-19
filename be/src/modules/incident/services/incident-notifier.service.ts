import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from 'src/modules/notification/notification.service';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { NotificationRefType } from 'src/common/enums/notification-ref-type.enum';

@Injectable()
export class IncidentNotifier {
  private readonly logger = new Logger(IncidentNotifier.name);

  constructor(private readonly notification: NotificationService) {}

  notify(
    userId: string | null | undefined,
    incidentId: string,
    title: string,
    content: string,
    event: string,
  ): void {
    if (!userId) return;
    void this.notification
      .notify({
        userId,
        type: NotificationType.INCIDENT_UPDATE,
        title,
        content,
        referenceType: NotificationRefType.INCIDENT,
        referenceId: incidentId,
        dedupeKey: `incident-${incidentId}-${event}`,
      })
      .catch((err) =>
        this.logger.error(
          `notify incident ${incidentId}/${event} thất bại: ${String(err)}`,
        ),
      );
  }
}
