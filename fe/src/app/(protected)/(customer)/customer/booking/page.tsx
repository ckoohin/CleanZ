import { BookingWizard } from "@/features/customer/booking/components/BookingWizard";

export default function BookingRoute({ searchParams }: { searchParams: { serviceId?: string } }) {
  return <BookingWizard serviceId={searchParams.serviceId} />;
}
