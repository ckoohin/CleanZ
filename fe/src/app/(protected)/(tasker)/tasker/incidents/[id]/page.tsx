import { TaskerIncidentDetail } from "@/features/incident/tasker/_components/TaskerIncidentDetail";

export default function TaskerIncidentDetailRoute({
  params,
}: {
  params: { id: string };
}) {
  return <TaskerIncidentDetail incidentId={params.id} />;
}
