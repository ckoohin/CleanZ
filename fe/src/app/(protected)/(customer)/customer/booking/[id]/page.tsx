import { CustomerBookingDetailPage } from "@/features/booking/_components/CustomerBookingDetailPage";

export default async function CustomerBookingDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <CustomerBookingDetailPage bookingId={id} />;
}
