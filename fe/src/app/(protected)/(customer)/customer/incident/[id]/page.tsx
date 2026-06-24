import { MyIncidentDetailPage } from "@/features/incident/customer/pages/MyIncidentDetailPage";

export default async function CustomerIncidentDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MyIncidentDetailPage incidentId={id} />;
}
