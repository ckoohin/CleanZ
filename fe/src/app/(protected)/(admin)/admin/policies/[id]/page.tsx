import { PolicyDetailView } from "@/features/admin/modules/policy/_components/PolicyDetailView";

export default async function AdminPolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PolicyDetailView id={id} />;
}
