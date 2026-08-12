"use client";

import { BanknoteArrowDown } from "lucide-react";
import { PageHeader } from "@/components/admin";
import { WithdrawalManagement } from "./WithdrawalManagement";

/**
 * `embedded` = đang nằm trong tab "Rút tiền" của `FinanceWorkspace`, nơi tiêu đề
 * trang đã được vẽ ở cấp trên. Không truyền cờ thì component tự dựng PageHeader
 * (dùng cho trường hợp đứng riêng một trang).
 */
export function UnifiedWithdrawalManagement({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  return (
    <div className="space-y-5">
      {!embedded && (
        <PageHeader
          title="Yêu cầu rút tiền"
          description="Kiểm tra và xét duyệt yêu cầu rút tiền của Tasker."
        />
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-[var(--c-muted)]">
          <BanknoteArrowDown className="size-4 text-[var(--c-primary-strong)]" />
          Rút thu nhập từ ví Tasker
        </div>
        <WithdrawalManagement embedded />
      </div>
    </div>
  );
}
