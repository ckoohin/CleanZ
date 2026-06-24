import { TaskerJobDetailPage } from "@/features/booking/_components/TaskerJobDetailPage";

export default async function TaskerJobDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <TaskerJobDetailPage bookingId={id} />;
}
