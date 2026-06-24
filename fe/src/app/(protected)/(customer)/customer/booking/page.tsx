import { BookingWizard } from "@/features/customer/booking/components/BookingWizard";

export default async function BookingRoute({
  searchParams,
}: {
  searchParams: Promise<{ serviceId?: string }>;
}) {
  const { serviceId } = await searchParams;
  return <BookingWizard serviceId={serviceId} />;
}
