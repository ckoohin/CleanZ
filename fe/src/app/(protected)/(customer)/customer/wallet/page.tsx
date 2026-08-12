import { WalletDashboard } from "@/features/customer/wallet/components/WalletDashboard";
// [TẠM TẮT] Rút tiền phía Customer — xem ghi chú ở đầu
// be/src/modules/wallet/customer-withdrawal.controller.ts
// import { WithdrawalSection } from "@/features/customer/wallet/components/WithdrawalSection";

export default function WalletRoute() {
  return (
    <div className="space-y-4">
      <WalletDashboard />
      {/* <div id="withdrawal-section" className="mx-auto w-full max-w-2xl px-4 sm:px-0 scroll-mt-6">
        <WithdrawalSection />
      </div> */}
    </div>
  );
}
