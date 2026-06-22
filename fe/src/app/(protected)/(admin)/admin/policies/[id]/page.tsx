import { PolicyDetailView } from "@/features/admin/modules/policy/_components/PolicyDetailView";

export default function AdminPolicyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <PolicyDetailView id={params.id} />;
}