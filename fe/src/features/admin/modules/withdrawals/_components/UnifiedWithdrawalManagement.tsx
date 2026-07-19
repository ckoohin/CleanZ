"use client";

import { BanknoteArrowDown, BriefcaseBusiness, UserRound } from "lucide-react";
import { PageHeader } from "@/components/admin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerWithdrawalManagement } from "@/features/admin/modules/customer-withdrawals/CustomerWithdrawalManagement";
import { WithdrawalManagement } from "./WithdrawalManagement";

export type WithdrawalOwnerType = "tasker" | "customer";

export function UnifiedWithdrawalManagement({
  initialOwnerType = "tasker",
}: {
  initialOwnerType?: WithdrawalOwnerType;
}) {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Yêu cầu rút tiền"
        description="Kiểm tra và xét duyệt yêu cầu rút tiền của Tasker và Khách hàng tại một nơi."
      />

      <Tabs defaultValue={initialOwnerType} className="space-y-5">
        <TabsList className="grid h-auto w-full max-w-xl grid-cols-2 rounded-2xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-1.5">
          <TabsTrigger
            value="tasker"
            className="gap-2 rounded-xl py-2.5 text-sm font-semibold data-[state=active]:bg-[var(--c-card)] data-[state=active]:text-[var(--c-primary-strong)] data-[state=active]:shadow-sm"
          >
            <BriefcaseBusiness className="size-4" />
            Tasker
          </TabsTrigger>
          <TabsTrigger
            value="customer"
            className="gap-2 rounded-xl py-2.5 text-sm font-semibold data-[state=active]:bg-[var(--c-card)] data-[state=active]:text-[var(--c-primary-strong)] data-[state=active]:shadow-sm"
          >
            <UserRound className="size-4" />
            Khách hàng
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasker" className="mt-0 space-y-4">
          <div className="flex items-center gap-2 text-sm text-[var(--c-muted)]">
            <BanknoteArrowDown className="size-4 text-[var(--c-primary-strong)]" />
            Rút thu nhập từ ví Tasker
          </div>
          <WithdrawalManagement embedded />
        </TabsContent>

        <TabsContent value="customer" className="mt-0 space-y-4">
          <div className="flex items-center gap-2 text-sm text-[var(--c-muted)]">
            <BanknoteArrowDown className="size-4 text-[var(--c-primary-strong)]" />
            Rút khoản hoàn tiền hoặc bồi thường từ ví Khách hàng
          </div>
          <CustomerWithdrawalManagement embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
