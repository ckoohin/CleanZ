import { TaskerListTable } from "@/features/admin/modules/tasker/_components/TaskerListTable";

export default function TaskerPremiumApprovalPage() {
  return <TaskerListTable initialEquipmentStatus="PENDING" premiumQueue />;
}
