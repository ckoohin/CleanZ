import { Tasker360View } from "@/features/admin/modules/tasker/_components/Tasker360View";

export default async function AdminTaskerDetailRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;

  return (
    <main className="min-h-screen bg-[var(--c-canvas)] py-6">
      <div className="w-full">
        <Tasker360View
          taskerId={id}
          initialTab={tab === "premium" ? "premium" : "overview"}
        />
      </div>
    </main>
  );
}
