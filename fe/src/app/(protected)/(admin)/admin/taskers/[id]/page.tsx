import { Tasker360View } from "@/features/admin/modules/tasker/_components/Tasker360View";

export default async function AdminTaskerDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-background py-6">
      <div className="w-full">
        <Tasker360View taskerId={id} />
      </div>
    </main>
  );
}
