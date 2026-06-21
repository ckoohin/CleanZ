import { MyTicketDetailPage } from "@/features/support-tickets/_components/MyTicketDetailPage";

export default function TaskerSupportTicketDetailRoute({
  params,
}: {
  params: { id: string };
}) {
  return <MyTicketDetailPage ticketId={params.id} />;
}
