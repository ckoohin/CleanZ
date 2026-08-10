"use client";

import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import type { BookingNoShow } from "@/features/booking/types/booking.types";

interface Props {
  noShow: BookingNoShow;
  debtRecovered?: number;
  onRebook: () => void;
  onSupport: () => void;
}

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

export function CustomerNoShowPanel({
  noShow,
  debtRecovered = 0,
  onRebook,
  onSupport,
}: Props) {
  const refund = noShow.refundAmount ?? 0;
  const recovered = Math.min(refund, Math.max(0, debtRecovered));
  const netWalletIncrease = Math.max(0, refund - recovered);

  return (
    <div
      className="space-y-3 rounded-3xl border border-amber-200 bg-amber-50 p-5"
      data-testid="customer-no-show-panel"
    >
      <div className="flex items-start gap-3">
        {noShow.reviewStatus === "CONFIRMED" ? (
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-500" />
        ) : noShow.reviewStatus === "EXCUSED" ? (
          <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
        )}
        <div>
          <h3 className="text-sm font-extrabold text-foreground">
            Đơn đã hủy do Tasker chưa check-in
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {noShow.reviewStatus === "CONFIRMED"
              ? "Admin đã xác nhận Tasker vi phạm no-show."
              : noShow.reviewStatus === "EXCUSED"
                ? "Admin xác định Tasker có lý do được miễn trách nhiệm. Quyền lợi hoàn tiền của bạn không thay đổi."
                : "CleanZ đang xem giải trình và sẽ thông báo khi có kết luận."}
          </p>
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-emerald-200 bg-white/80 p-4">
        {refund > 0 ? (
          <div className="space-y-1.5 text-xs">
            <p className="flex justify-between gap-3 text-muted-foreground">
              <span>Hoàn tiền danh nghĩa</span>
              <strong className="tabular-nums text-foreground">
                {formatVnd(refund)}
              </strong>
            </p>
            {recovered > 0 && (
              <p className="flex justify-between gap-3 text-amber-700">
                <span>Đã tự trừ công nợ</span>
                <strong className="tabular-nums">
                  −{formatVnd(recovered)}
                </strong>
              </p>
            )}
            <p className="flex justify-between gap-3 border-t border-emerald-100 pt-2 font-semibold text-emerald-800">
              <span>Thực tăng trong Ví CleanZ</span>
              <strong className="tabular-nums">
                {formatVnd(netWalletIncrease)}
              </strong>
            </p>
          </div>
        ) : (
          <p className="text-xs font-semibold text-emerald-700">
            Bạn không bị tính phí cho đơn này
          </p>
        )}
        <p className="mt-1 text-[11px] text-muted-foreground">
          Hoàn tiền và nhả voucher được xử lý ngay, không phải chờ Admin review.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onSupport}
          className="rounded-2xl border border-border bg-card py-3 text-xs font-bold text-foreground"
        >
          Cần hỗ trợ
        </button>
        <button
          type="button"
          onClick={onRebook}
          className="rounded-2xl bg-primary py-3 text-xs font-bold text-primary-foreground"
        >
          Đặt lại dịch vụ
        </button>
      </div>
    </div>
  );
}
