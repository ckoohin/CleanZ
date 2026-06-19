import { CustomerBookingDetailPage } from "@/features/booking/_components/CustomerBookingDetailPage";

export default function CustomerBookingDetailRoute({
  params,
}: {
  params: { id: string };
}) {
  return <CustomerBookingDetailPage bookingId={params.id} />;
}
