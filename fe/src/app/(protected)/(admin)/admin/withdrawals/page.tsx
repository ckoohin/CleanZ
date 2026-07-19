import {
  UnifiedWithdrawalManagement,
  type WithdrawalOwnerType,
} from "@/features/admin/modules/withdrawals/_components/UnifiedWithdrawalManagement";

export default async function AdminWithdrawalsPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source } = await searchParams;
  const initialOwnerType: WithdrawalOwnerType =
    source === "customer" ? "customer" : "tasker";

  return <UnifiedWithdrawalManagement initialOwnerType={initialOwnerType} />;
}
