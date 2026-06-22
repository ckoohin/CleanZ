import { redirect } from "next/navigation";

export default function BookingRoute({ searchParams }: { searchParams?: { serviceId?: string } }) {
  if (searchParams?.serviceId) {
    redirect(`/booking/${searchParams.serviceId}`);
  }
  redirect("/customer/catalog");
}
