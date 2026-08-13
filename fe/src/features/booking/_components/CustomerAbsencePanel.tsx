"use client";

import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  ShieldCheck,
  WalletCards,
  XCircle,
} from "lucide-react";
import type { CustomerBookingAbsenceReport } from "@/features/booking/types/absence-report.types";

function dateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

const META = {
  PENDING_REVIEW: {
    title: "CleanZ đang xác minh báo cáo khách vắng",
    description:
      "Tasker báo không liên hệ được với bạn sau khi đã check-in và chờ tại địa chỉ.",
    icon: Clock3,
    card: "border-amber-200 bg-amber-50/70",
    iconClass: "bg-amber-100 text-amber-700",
  },
  APPROVED: {
    title: "Báo cáo khách vắng đã được xác nhận",
    description:
      "CleanZ đã đối chiếu hồ sơ và hoàn tất xử lý đơn theo báo cáo.",
    icon: ShieldCheck,
    card: "border-rose-200 bg-rose-50/60",
    iconClass: "bg-rose-100 text-rose-700",
  },
  REJECTED: {
    title: "Báo cáo khách vắng không được chấp nhận",
    description: "CleanZ đã hoàn tất xử lý đơn theo kết quả xác minh.",
    icon: XCircle,
    card: "border-emerald-200 bg-emerald-50/60",
    iconClass: "bg-emerald-100 text-emerald-700",
  },
  EXPIRED: {
    title: "Báo cáo đã quá hạn duyệt",
    description:
      "Hệ thống đã tự chốt đơn theo chính sách khách hàng vắng mặt.",
    icon: AlertTriangle,
    card: "border-slate-200 bg-slate-50",
    iconClass: "bg-slate-200 text-slate-700",
  },
} as const;

export function CustomerAbsencePanel({
  report,
  onDispute,
  onOpenWallet,
}: {
  report: CustomerBookingAbsenceReport;
  onDispute: () => void;
  onOpenWallet: () => void;
}) {
  const meta = META[report.status];
  const Icon = meta.icon;
  const canDispute = report.status === "APPROVED";
  const shouldShowWalletAction =
    report.status === "APPROVED" && report.advancedByPlatform > 0;

  return (
    <section className={`rounded-2xl border p-4 shadow-sm ${meta.card}`}>
      <div className="flex items-start gap-3">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${meta.iconClass}`}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Báo cáo khách vắng
          </p>
          <h2 className="mt-1 text-sm font-black leading-snug text-foreground">
            {meta.title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {meta.description}
          </p>
        </div>
      </div>

      <div className="mt-3 border-t border-current/10 pt-3 text-xs leading-5 text-muted-foreground">
        {report.status === "PENDING_REVIEW" ? (
          <>
            Dự kiến có kết quả trước{" "}
            <strong className="text-foreground">
              {dateTime(report.reviewDueAt)}
            </strong>
            . CleanZ sẽ thông báo khi có cập nhật.
          </>
        ) : (
          <>
            Kết quả xử lý:{" "}
            <strong className="text-foreground">
              {report.reviewReason ||
                "Đã chốt theo chính sách khách hàng vắng mặt."}
            </strong>
          </>
        )}
      </div>

      {(shouldShowWalletAction || canDispute) && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          {shouldShowWalletAction && (
            <button
              type="button"
              onClick={onOpenWallet}
              className="flex min-h-11 flex-1 items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-white/80 px-3.5 py-2.5 text-left"
            >
              <span className="flex items-center gap-3">
                <WalletCards className="size-4 text-rose-600" />
                <span>
                  <strong className="block text-xs text-foreground">
                    Xem Ví CleanZ
                  </strong>
                  <span className="text-[11px] text-muted-foreground">
                    Có cập nhật liên quan đến đơn này
                  </span>
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          )}

          {canDispute && (
            <button
              type="button"
              onClick={onDispute}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-foreground/15 bg-white px-3.5 py-2.5 text-xs font-bold text-foreground transition hover:bg-muted/30"
            >
              <AlertTriangle className="size-4 text-amber-600" />
              Khiếu nại
            </button>
          )}
        </div>
      )}
    </section>
  );
}
