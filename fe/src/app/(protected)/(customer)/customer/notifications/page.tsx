import { NotificationInbox } from "@/features/notifications/_components/NotificationInbox";

export default function CustomerNotificationsRoute() {
  return <NotificationInbox basePath="/customer" bookingSegment="booking" />;
}
