import { CustomerDetailPage } from "@/features/admin-customer/_components/CustomerDetailPage";

export default function AdminCustomerDetailRoute({
  params,
}: {
  params: { id: string };
}) {
  return (
    <main className="min-h-screen bg-background py-6">
      <div className="w-full">
        <CustomerDetailPage customerId={params.id} />
      </div>
    </main>
  );
}
