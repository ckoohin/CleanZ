import { TaskerJobDetailPage } from "@/features/booking/_components/TaskerJobDetailPage";

export default async function TaskerJobDetailRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const [{ id }, { mode }] = await Promise.all([params, searchParams]);

  return <TaskerJobDetailPage bookingId={id} mode={mode} />;
}
