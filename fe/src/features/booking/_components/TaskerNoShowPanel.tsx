"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import type { BookingNoShow } from "@/features/booking/types/booking.types";

interface Props {
  noShow: BookingNoShow;
  isPending: boolean;
  onSubmit: (explanation: string) => void;
  onBack: () => void;
}

export function TaskerNoShowPanel({
  noShow,
  isPending,
  onSubmit,
  onBack,
}: Props) {
  const [explanation, setExplanation] = useState(noShow.explanation ?? "");

  const trimmed = explanation.trim();

  return (
    <div
      className={`rounded-2xl border p-4 space-y-3 ${
        noShow.reviewStatus === "EXCUSED"
          ? "border-emerald-200 bg-emerald-50"
          : noShow.reviewStatus === "CONFIRMED"
            ? "border-red-200 bg-red-50"
            : "border-amber-200 bg-amber-50"
      }`}
      data-testid="tasker-no-show-panel"
    >
      <div className="flex items-start gap-3">
        {noShow.reviewStatus === "EXCUSED" ? (
          <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
        ) : noShow.reviewStatus === "CONFIRMED" ? (
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-500" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
        )}
        <div>
          <p className="text-sm font-bold text-foreground">
            {noShow.reviewStatus === "EXCUSED"
              ? "Đã chấp nhận giải trình"
              : noShow.reviewStatus === "CONFIRMED"
                ? "Admin xác nhận no-show"
                : "Đang chờ Admin review no-show"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {noShow.reviewStatus === "EXCUSED"
              ? "Bạn không bị cộng điểm cho booking này."
              : noShow.reviewStatus === "CONFIRMED"
                ? `Bạn bị cộng ${noShow.warningPoints ?? 0} điểm cảnh báo.`
                : "Bạn chưa bị cộng điểm. Hãy mô tả rõ sự việc và bằng chứng liên hệ với khách để Admin xem xét."}
          </p>
        </div>
      </div>

      {noShow.reviewReason && noShow.reviewStatus !== "PENDING_REVIEW" && (
        <div className="rounded-xl border border-black/5 bg-white/70 p-3 text-xs">
          <p className="font-semibold text-foreground">Kết luận của Admin</p>
          <p className="mt-1 leading-relaxed text-muted-foreground">
            {noShow.reviewReason}
          </p>
        </div>
      )}

      {noShow.reviewStatus === "PENDING_REVIEW" && (
        <div className="space-y-2">
          <textarea
            value={explanation}
            onChange={(event) => setExplanation(event.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Ví dụ: sự cố bất khả kháng, thời điểm và cách bạn đã liên hệ khách..."
            className="w-full resize-none rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
            aria-label="Giải trình no-show"
          />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Tối thiểu 10 ký tự</span>
            <span>{explanation.length}/1000</span>
          </div>
          <button
            type="button"
            onClick={() => onSubmit(trimmed)}
            disabled={trimmed.length < 10 || isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {noShow.explanation ? "Cập nhật giải trình" : "Gửi giải trình"}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onBack}
        className="w-full text-xs font-bold text-primary"
      >
        ← Về danh sách đơn
      </button>
    </div>
  );
}
