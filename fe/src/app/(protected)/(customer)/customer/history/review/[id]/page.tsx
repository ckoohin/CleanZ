import { ReviewForm } from "@/features/customer/history/components/ReviewForm";

export default function ReviewRoute({ params }: { params: { id: string } }) {
  return <ReviewForm bookingId={params.id} />;
}
