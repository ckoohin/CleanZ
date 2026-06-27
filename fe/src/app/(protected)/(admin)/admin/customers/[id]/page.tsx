import { CustomerDetailPage } from "@/features/admin/modules/customer/_components/CustomerDetailPage";

export default async function AdminCustomerDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-[var(--c-canvas)] py-6">
      <div className="w-full">
        <CustomerDetailPage customerId={id} />
      </div>
    </main>
  );
}
