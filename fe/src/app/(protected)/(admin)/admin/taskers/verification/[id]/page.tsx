import { TaskerApprovalDetail } from "@/features/admin/modules/tasker/_components/TaskerApprovalDetail";

export default async function TaskerVerificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-background py-6">
      <TaskerApprovalDetail taskerId={id} />
    </main>
  );
}
