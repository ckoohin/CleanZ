import { NotificationInbox } from "@/features/notifications/_components/NotificationInbox";

export default function TaskerNotificationsRoute() {
  return (
    <NotificationInbox
      basePath="/tasker"
      bookingSegment="jobs"
      incidentSegment="incidents"
      enableRealtime={false}
      showBackButton={false}
    />
  );
}
