import { WalletDashboard } from "@/features/customer/wallet/components/WalletDashboard";
import { WithdrawalSection } from "@/features/customer/wallet/components/WithdrawalSection";

export default function WalletRoute() {
  return (
    <div className="space-y-4">
      <WalletDashboard />
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-0">
        <WithdrawalSection />
      </div>
    </div>
  );
}
