import { TaskerDetailPage } from "@/features/admin-tasker/_components/TaskerDetailPage";

export default async function AdminTaskerDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-background py-6">
      <div className="w-full">
        <TaskerDetailPage taskerId={id} />
      </div>
    </main>
  );
}
