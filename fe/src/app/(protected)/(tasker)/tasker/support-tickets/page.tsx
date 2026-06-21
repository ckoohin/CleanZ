import { MyTicketListPage } from "@/features/support-tickets/_components/MyTicketListPage";
import { ROUTES } from "@/constants/routes";

export default function TaskerSupportTicketsRoute() {
  return <MyTicketListPage basePath={ROUTES.TASKER.SUPPORT_TICKETS} />;
}
