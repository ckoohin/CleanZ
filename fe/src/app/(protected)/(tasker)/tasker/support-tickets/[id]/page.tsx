import { MyTicketDetailPage } from "@/features/support-tickets/_components/MyTicketDetailPage";

export default async function TaskerSupportTicketDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MyTicketDetailPage ticketId={id} />;
}
