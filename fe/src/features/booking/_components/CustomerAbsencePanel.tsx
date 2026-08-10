"use client";

import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock3,
  ReceiptText,
  ShieldCheck,
  WalletCards,
  XCircle,
} from "lucide-react";
import type { CustomerBookingAbsenceReport } from "@/features/booking/types/absence-report.types";

function money(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

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
      "CleanZ đã đối chiếu hồ sơ và hoàn tất xử lý tài chính của đơn.",
    icon: ShieldCheck,
    card: "border-rose-200 bg-rose-50/60",
    iconClass: "bg-rose-100 text-rose-700",
  },
  REJECTED: {
    title: "Báo cáo khách vắng không được chấp nhận",
    description: "Khoản tiền còn giữ đã được hoàn về Ví CleanZ của bạn.",
    icon: XCircle,
    card: "border-emerald-200 bg-emerald-50/60",
    iconClass: "bg-emerald-100 text-emerald-700",
  },
  EXPIRED: {
    title: "Báo cáo đã quá hạn duyệt",
    description:
      "Hệ thống đã tự chốt và hoàn khoản đang giữ về Ví CleanZ của bạn.",
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
  const grossRefund = report.refundedUpfront + report.refundedOnClose;
  const debtRecovered =
    report.debtRecoveredUpfront + report.debtRecoveredOnClose;
  const netWalletIncrease = Math.max(0, grossRefund - debtRecovered);

  return (
    <section
      className={`space-y-5 rounded-3xl border p-5 shadow-sm sm:p-6 ${meta.card}`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${meta.iconClass}`}
        >
          <Icon className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">
            Lý do hủy · Khách hàng vắng mặt
          </p>
          <h2 className="mt-1.5 text-base font-black leading-snug text-foreground">
            {meta.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {meta.description}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/80 bg-white/75 p-4">
          <p className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <Banknote className="size-4 text-emerald-600" /> Đã hoàn ngay
          </p>
          <p className="mt-2 text-xl font-black tabular-nums text-foreground">
            {money(report.refundedUpfront)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/80 bg-white/75 p-4">
          <p className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            {report.status === "PENDING_REVIEW" ? (
              <Clock3 className="size-4 text-amber-600" />
            ) : (
              <CheckCircle2 className="size-4 text-emerald-600" />
            )}
            {report.status === "PENDING_REVIEW"
              ? "Đang giữ chờ xử lý"
              : "Hoàn thêm khi chốt"}
          </p>
          <p className="mt-2 text-xl font-black tabular-nums text-foreground">
            {money(
              report.status === "PENDING_REVIEW"
                ? report.heldForReview
                : report.refundedOnClose,
            )}
          </p>
        </div>
      </div>

      {grossRefund > 0 && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
          <div className="flex items-start gap-3">
            <ReceiptText className="mt-0.5 size-5 shrink-0 text-blue-700" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex justify-between gap-4">
                <span>Hoàn tiền danh nghĩa</span>
                <strong className="tabular-nums">{money(grossRefund)}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span>Đã tự trừ công nợ</span>
                <strong className="tabular-nums">
                  −{money(debtRecovered)}
                </strong>
              </div>
              <div className="flex justify-between gap-4 border-t border-blue-200 pt-2 text-base">
                <span className="font-bold">Thực tăng trong ví</span>
                <strong className="tabular-nums text-blue-800">
                  {money(netWalletIncrease)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/80 bg-white/70 p-4 text-xs leading-5 text-muted-foreground">
        {report.status === "PENDING_REVIEW" ? (
          <>
            CleanZ dự kiến chốt trước{" "}
            <strong className="text-foreground">
              {dateTime(report.reviewDueAt)}
            </strong>
            . Khi duyệt, Tasker có thể nhận bồi hoàn{" "}
            {money(report.compensationAmount)}.
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

      {report.advancedByPlatform > 0 && report.status === "APPROVED" && (
        <button
          type="button"
          onClick={onOpenWallet}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-white px-4 py-3.5 text-left"
        >
          <span className="flex items-center gap-3">
            <WalletCards className="size-5 text-rose-600" />
            <span>
              <strong className="block text-sm text-foreground">
                Có khoản nền tảng đã ứng {money(report.advancedByPlatform)}
              </strong>
              <span className="text-xs text-muted-foreground">
                Mở Ví CleanZ để xem công nợ còn lại
              </span>
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
        </button>
      )}

      <button
        type="button"
        onClick={onDispute}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-foreground/15 bg-white px-4 py-3.5 text-sm font-bold text-foreground transition hover:bg-muted/30"
      >
        <AlertTriangle className="size-4 text-amber-600" />
        Khiếu nại kết quả khách vắng
      </button>
    </section>
  );
}
