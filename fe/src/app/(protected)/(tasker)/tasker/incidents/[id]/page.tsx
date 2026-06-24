import { TaskerIncidentDetail } from "@/features/incident/tasker/_components/TaskerIncidentDetail";

export default async function TaskerIncidentDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TaskerIncidentDetail incidentId={id} />;
}
