import { notFound } from "next/navigation";

// [TẠM TẮT] Rút tiền phía Customer — xem ghi chú ở đầu
// be/src/modules/wallet/customer-withdrawal.controller.ts
// import { CustomerWithdrawalManagement } from "@/features/admin/modules/customer-withdrawals/CustomerWithdrawalManagement";

export default function AdminCustomerWithdrawalsPage() {
  notFound();
  // return <CustomerWithdrawalManagement />;
}
