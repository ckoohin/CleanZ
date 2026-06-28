import { ReviewForm } from "@/features/customer/history/components/ReviewForm";

export default async function ReviewRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReviewForm bookingId={id} />;
}
