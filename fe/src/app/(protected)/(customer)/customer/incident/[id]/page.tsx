import { MyIncidentDetailPage } from "@/features/incident/customer/pages/MyIncidentDetailPage";

export default function CustomerIncidentDetailRoute({
  params,
}: {
  params: { id: string };
}) {
  return <MyIncidentDetailPage incidentId={params.id} />;
}
