import { TaskerJobDetailPage } from "@/features/booking/_components/TaskerJobDetailPage";

export default function TaskerJobDetailRoute({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { mode?: string };
}) {
  return <TaskerJobDetailPage bookingId={params.id} mode={searchParams.mode} />;
}
