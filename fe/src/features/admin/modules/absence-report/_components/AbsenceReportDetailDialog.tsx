"use client";

import * as React from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  Banknote,
  Camera,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  Maximize2,
  PhoneCall,
  ShieldCheck,
  UserRoundX,
  X,
  XCircle,
} from "lucide-react";
import { AdminButton, AdminDialog, StatusBadge } from "@/components/admin";
import ErrorBoundary from "@/components/error/ErrorBoundary";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  useAdminAbsenceReport,
  useReviewAbsenceReport,
  useWriteOffAbsenceDebt,
} from "../hooks/useAdminAbsenceReports";

const CheckinComparisonMap = dynamic(
  () =>
    import("@/features/admin/modules/checkin-review/_components/CheckinComparisonMap").then(
      (module) => module.CheckinComparisonMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 animate-pulse rounded-2xl bg-slate-100 sm:h-96" />
    ),
  },
);

function money(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

function dateTime(value?: string | null) {
  return value
    ? new Date(value).toLocaleString("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";
}

function coordinates(latitude: number | null, longitude: number | null) {
  if (latitude == null || longitude == null) return "Không có tọa độ";
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function PhotoLightbox({
  photo,
  onClose,
}: {
  photo: { title: string; url: string };
  onClose: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        className="z-[100] flex h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-6xl flex-col gap-0 overflow-hidden rounded-3xl border-white/15 bg-slate-950 p-0 shadow-2xl sm:max-w-6xl [&>[data-slot=dialog-close]]:hidden"
      >
        <DialogTitle className="sr-only">Xem ảnh {photo.title}</DialogTitle>
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 text-white">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/55">
              Bằng chứng Tasker gửi
            </p>
            <h3 className="mt-1 truncate font-bold">{photo.title}</h3>
          </div>
          <button
            type="button"
            aria-label="Đóng xem ảnh"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="relative min-h-0 flex-1 bg-black">
          <Image
            src={photo.url}
            alt={photo.title}
            fill
            unoptimized
            className="object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EvidencePhoto({
  title,
  description,
  url,
  kind,
  onOpen,
}: {
  title: string;
  description: string;
  url: string | null;
  kind: "address" | "callHistory";
  onOpen: () => void;
}) {
  const isAddress = kind === "address";
  const Icon = isAddress ? Camera : PhoneCall;
  return (
    <article className="space-y-4 rounded-2xl border border-[var(--c-line)] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-xl ${
              isAddress
                ? "bg-amber-100 text-amber-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            <Icon className="size-4.5" />
          </span>
          <div>
            <h3 className="font-bold text-[var(--c-ink)]">{title}</h3>
            <p className="mt-1 text-xs leading-5 text-[var(--c-muted)]">
              {description}
            </p>
          </div>
        </div>
        {url && (
          <button
            type="button"
            aria-label={`Mở ảnh ${title}`}
            onClick={onOpen}
            className={`inline-flex shrink-0 items-center gap-1 text-xs font-semibold hover:underline ${
              isAddress ? "text-amber-700" : "text-blue-700"
            }`}
          >
            Mở ảnh <Maximize2 className="size-3.5" />
          </button>
        )}
      </div>

      {url ? (
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--c-line)] bg-slate-100">
          <Image
            src={url}
            alt={title}
            fill
            unoptimized
            className="object-contain"
          />
        </div>
      ) : (
        <div className="grid aspect-[4/3] place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <div>
            <Icon className="mx-auto size-7 text-slate-400" />
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Hồ sơ cũ chưa có ảnh này
            </p>
          </div>
        </div>
      )}
    </article>
  );
}

const ATTENTION_REASON_COPY: Record<string, string> = {
  "Check-in ngoài bán kính": "Vị trí check-in cách xa địa chỉ của khách",
  "Check-in còn chờ hậu kiểm": "Lần check-in này chưa được xác minh xong",
  "Tasker có tỷ lệ báo cáo bị từ chối cao":
    "Nhiều báo cáo gần đây của Tasker không được chấp nhận",
  "Khách đã mở phiếu khiếu nại": "Khách đã gửi yêu cầu xem xét vụ việc",
};

const REVIEW_REASON_SUGGESTIONS = [
  {
    label: "Bằng chứng đầy đủ",
    text: "Bằng chứng đầy đủ, vị trí và lịch sử liên hệ phù hợp.",
  },
  {
    label: "Ảnh địa chỉ chưa rõ",
    text: "Ảnh địa chỉ chưa đủ rõ để xác minh Tasker đã đến.",
  },
  {
    label: "Thiếu lịch sử gọi",
    text: "Chưa có đủ bằng chứng Tasker đã liên hệ với khách.",
  },
  {
    label: "Vị trí không khớp",
    text: "Vị trí Tasker ghi nhận không khớp với địa chỉ của khách.",
  },
] as const;

const DEBT_WRITE_OFF_SUGGESTIONS = [
  {
    label: "Không liên hệ được",
    text: "Không thể liên hệ khách sau nhiều lần thử.",
  },
  {
    label: "Không còn khả năng thu",
    text: "Khoản nợ không còn khả năng thu hồi.",
  },
  {
    label: "Đã xác minh hoàn cảnh",
    text: "Đã xác minh hoàn cảnh và được phép hỗ trợ xóa nợ.",
  },
] as const;

function plainAttentionReason(reason: string) {
  return ATTENTION_REASON_COPY[reason] ?? reason;
}

function appendSuggestion(current: string, suggestion: string) {
  const normalized = current.trim();
  if (normalized.includes(suggestion)) return current;
  return `${normalized}${normalized ? " " : ""}${suggestion}`.slice(0, 1000);
}

function MoneyRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--c-line)] py-3 first:pt-0 last:border-b-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--c-ink)]">{label}</p>
        {hint && (
          <p className="mt-0.5 text-xs leading-5 text-[var(--c-muted)]">
            {hint}
          </p>
        )}
      </div>
      <p
        className={`shrink-0 font-bold tabular-nums ${
          value === 0 ? "text-[var(--c-muted)]" : "text-[var(--c-ink)]"
        }`}
      >
        {money(value)}
      </p>
    </div>
  );
}

function QuickTextSuggestions({
  value,
  onChange,
  suggestions,
}: {
  value: string;
  onChange: (value: string) => void;
  suggestions: ReadonlyArray<{ label: string; text: string }>;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-[var(--c-muted)]">Gợi ý nhanh</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => {
          const alreadyAdded = value.includes(suggestion.text);
          return (
            <button
              key={suggestion.label}
              type="button"
              disabled={alreadyAdded}
              onClick={() => onChange(appendSuggestion(value, suggestion.text))}
              className="rounded-full border border-[var(--c-line)] bg-[var(--c-card)] px-3 py-1.5 text-left text-xs font-semibold text-[var(--c-ink)] transition hover:border-[var(--c-primary)] hover:bg-amber-50 hover:text-amber-800 disabled:cursor-default disabled:border-emerald-200 disabled:bg-emerald-50 disabled:text-emerald-700"
            >
              {alreadyAdded
                ? `Đã thêm · ${suggestion.label}`
                : suggestion.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AbsenceReportDetailDialog({
  reportId,
  open,
  onOpenChange,
}: {
  reportId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: report, isLoading } = useAdminAbsenceReport(
    open ? reportId : null,
  );
  const review = useReviewAbsenceReport();
  const writeOff = useWriteOffAbsenceDebt();
  const [reason, setReason] = React.useState("");
  const [writeOffReason, setWriteOffReason] = React.useState("");
  const [previewPhoto, setPreviewPhoto] = React.useState<{
    title: string;
    url: string;
  } | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setReason("");
      setWriteOffReason("");
      setPreviewPhoto(null);
    }
    onOpenChange(nextOpen);
  };

  const submit = async (decision: "APPROVE" | "REJECT") => {
    if (!report) return;
    if (decision === "REJECT" && reason.trim().length < 10) return;
    await review.mutateAsync({
      id: report.id,
      decision,
      reason: reason.trim() || undefined,
    });
    handleOpenChange(false);
  };

  const pending = report?.status === "PENDING_REVIEW";
  return (
    <AdminDialog
      open={open}
      onOpenChange={handleOpenChange}
      size="xl"
      title={
        <span className="flex items-center gap-2">
          <UserRoundX className="size-5 text-amber-600" />
          {report
            ? `Khách vắng · ${report.booking.bookingCode}`
            : "Hồ sơ khách vắng"}
        </span>
      }
      description="Xem ảnh, lịch sử liên hệ và số tiền trước khi quyết định."
      className="max-h-[calc(100dvh-2rem)] sm:max-w-[96vw] 2xl:max-w-[88rem]"
      bodyClassName="max-h-[calc(100dvh-12rem)] p-0"
      footer={
        pending ? (
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AdminButton
              variant="danger"
              disabled={review.isPending || reason.trim().length < 10}
              onClick={() => void submit("REJECT")}
            >
              <XCircle className="size-4" /> Từ chối báo cáo
            </AdminButton>
            <AdminButton
              disabled={review.isPending}
              onClick={() => void submit("APPROVE")}
            >
              {review.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Duyệt & chi trả
            </AdminButton>
          </div>
        ) : undefined
      }
    >
      {isLoading || !report ? (
        <div className="flex min-h-72 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-amber-600" />
        </div>
      ) : (
        <div
          data-testid="absence-report-layout"
          className="grid gap-0 xl:grid-cols-[minmax(0,1.55fr)_minmax(22rem,0.85fr)]"
        >
          <div className="min-w-0 space-y-7 p-5 sm:p-7 xl:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                tone={
                  report.status === "PENDING_REVIEW"
                    ? "warning"
                    : report.status === "APPROVED"
                      ? "success"
                      : report.status === "REJECTED"
                        ? "danger"
                        : "neutral"
                }
              >
                {report.status === "PENDING_REVIEW"
                  ? "Chờ duyệt"
                  : report.status === "APPROVED"
                    ? "Đã duyệt"
                    : report.status === "REJECTED"
                      ? "Đã từ chối"
                      : "Quá hạn xử lý"}
              </StatusBadge>
              {report.needsAttention && (
                <StatusBadge tone="danger">Cần xem kỹ</StatusBadge>
              )}
              <span className="text-xs text-[var(--c-muted)]">
                Báo lúc {dateTime(report.reportedAt)} · đã chờ{" "}
                {report.waitedMinutes} phút
              </span>
            </div>

            <section className="space-y-4">
              <div>
                <h3 className="font-bold text-[var(--c-ink)]">
                  Bằng chứng Tasker gửi
                </h3>
                <p className="mt-1 text-xs leading-5 text-[var(--c-muted)]">
                  Đối chiếu độc lập ảnh địa chỉ với lịch sử liên hệ trước khi
                  duyệt.
                </p>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <EvidencePhoto
                  kind="address"
                  title="Địa chỉ khách hàng"
                  description="Ảnh chụp tại địa chỉ hoặc khu vực trước cửa/sảnh."
                  url={report.proofPhotoUrl}
                  onOpen={() =>
                    report.proofPhotoUrl &&
                    setPreviewPhoto({
                      title: "Địa chỉ khách hàng",
                      url: report.proofPhotoUrl,
                    })
                  }
                />
                <EvidencePhoto
                  kind="callHistory"
                  title="Lịch sử cuộc gọi"
                  description="Ảnh chụp màn hình các lần Tasker đã gọi khách."
                  url={report.callHistoryPhotoUrl}
                  onOpen={() =>
                    report.callHistoryPhotoUrl &&
                    setPreviewPhoto({
                      title: "Lịch sử cuộc gọi",
                      url: report.callHistoryPhotoUrl,
                    })
                  }
                />
              </div>
              {report.taskerNote && (
                <p className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                  “{report.taskerNote}”
                </p>
              )}
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--c-line)] p-4">
                <p className="text-xs font-semibold text-[var(--c-muted)]">
                  Tasker · 30 ngày
                </p>
                <p className="mt-2 font-bold">
                  {report.tasker?.fullName ?? "—"}
                </p>
                <p className="mt-1 text-sm text-[var(--c-muted)]">
                  {report.taskerStats30d.reported} báo cáo ·{" "}
                  {report.taskerStats30d.rejected} bị từ chối ·{" "}
                  {report.taskerStats30d.expired} quá SLA
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--c-line)] p-4">
                <p className="text-xs font-semibold text-[var(--c-muted)]">
                  Khách · 90 ngày
                </p>
                <p className="mt-2 font-bold">
                  {report.customer.fullName ?? "Khách vãng lai"}
                </p>
                <p className="mt-1 text-sm text-[var(--c-muted)]">
                  {report.customerApproved90d} lần vắng mặt đã được xác nhận
                </p>
              </div>
            </section>

            <section className="space-y-5 rounded-2xl border border-[var(--c-line)] p-4 sm:p-5">
              <h3 className="flex items-center gap-2 font-bold">
                <MapPin className="size-4 text-blue-600" /> Dữ liệu check-in
              </h3>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-[var(--c-muted)]">Thời điểm:</span>{" "}
                  {dateTime(report.booking.checkedInAt)}
                </p>
                <p>
                  <span className="text-[var(--c-muted)]">Khoảng cách:</span>{" "}
                  {report.checkinDistanceMeters == null
                    ? "Không có GPS"
                    : `${Math.round(report.checkinDistanceMeters)}m`}
                </p>
                <p className="sm:col-span-2">
                  <span className="text-[var(--c-muted)]">Địa chỉ:</span>{" "}
                  {report.booking.address}
                </p>
              </div>

              <div className="space-y-3 border-t border-[var(--c-line)] pt-5">
                <div>
                  <p className="font-bold text-[var(--c-ink)]">
                    Bản đồ đối chiếu vị trí
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--c-muted)]">
                    Marker vàng là nơi Tasker check-in; marker xanh là địa chỉ
                    khách hàng được chốt tại thời điểm đó.
                  </p>
                </div>

                <ErrorBoundary
                  fallback={
                    <div className="grid h-72 place-items-center rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-6 text-center text-sm font-semibold text-amber-800">
                      Bản đồ gặp lỗi hiển thị. Admin vẫn có thể đối chiếu tọa độ
                      bên dưới.
                    </div>
                  }
                >
                  <CheckinComparisonMap
                    checkinLatitude={report.booking.checkinLatitude}
                    checkinLongitude={report.booking.checkinLongitude}
                    targetLatitude={report.booking.checkinTargetLatitude}
                    targetLongitude={report.booking.checkinTargetLongitude}
                  />
                </ErrorBoundary>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-bold text-amber-800">
                      Tasker check-in
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-amber-950">
                      {coordinates(
                        report.booking.checkinLatitude,
                        report.booking.checkinLongitude,
                      )}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-xs font-bold text-blue-800">
                      Địa chỉ khách hàng
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-blue-950">
                      {coordinates(
                        report.booking.checkinTargetLatitude,
                        report.booking.checkinTargetLongitude,
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="min-w-0 space-y-7 border-t border-[var(--c-line)] bg-[var(--c-card-2)] p-5 sm:p-7 xl:border-l xl:border-t-0">
            {report.attentionReasons.length > 0 && (
              <div
                role="alert"
                className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-950"
              >
                <p className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="size-4" /> Kiểm tra trước khi quyết
                  định
                </p>
                <p className="mt-1 text-xs leading-5 text-rose-800">
                  Có {report.attentionReasons.length} điểm cần đối chiếu:
                </p>
                <ul className="mt-2 space-y-1 pl-5 text-sm">
                  {report.attentionReasons.map((item) => (
                    <li key={item} className="list-disc">
                      {plainAttentionReason(item)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <section className="space-y-4" aria-labelledby="approval-preview">
              <div>
                <h3
                  id="approval-preview"
                  className="flex items-center gap-2 font-bold"
                >
                  <Banknote className="size-4 text-emerald-600" /> Dự kiến sau
                  khi duyệt
                </h3>
                <p className="mt-1 text-xs leading-5 text-[var(--c-muted)]">
                  Hệ thống đã tính sẵn, Admin không cần nhập số tiền.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-sm font-semibold text-emerald-800">
                  Tasker sẽ nhận
                </p>
                <p className="mt-1 text-3xl font-black tabular-nums text-emerald-950">
                  {money(report.compensationAmount)}
                </p>
                <p className="mt-2 text-xs leading-5 text-emerald-800">
                  Tasker nhận đủ số tiền này, không bị trừ phí.
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--c-muted)]">
                  Tiền được lấy từ
                </p>
                <MoneyRow
                  label="Tiền đơn đang giữ"
                  value={report.fundingPreview.paidFromEscrow}
                />
                <MoneyRow
                  label="Thu thêm từ ví khách"
                  value={report.fundingPreview.paidFromCustomerWallet}
                />
                <MoneyRow
                  label="CleanZ ứng trước"
                  value={report.fundingPreview.advancedByPlatform}
                  hint="Khách sẽ hoàn lại khoản này sau."
                />
                <MoneyRow
                  label="CleanZ hỗ trợ"
                  value={report.fundingPreview.platformBorneAmount}
                  hint="Khách không phải hoàn lại khoản này."
                />
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="font-bold text-[var(--c-ink)]">
                Tiền của đơn đang được xử lý
              </h3>
              <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-4">
                <MoneyRow
                  label="Đã hoàn cho khách"
                  value={report.refundedUpfront}
                />
                <MoneyRow
                  label="Đang tạm giữ"
                  value={report.heldForReview}
                  hint="Chỉ chi sau khi hồ sơ được duyệt."
                />
              </div>
            </section>

            {report.debt && (
              <section className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-rose-700">
                      Khoản khách còn nợ
                    </p>
                    <p className="mt-1 text-xl font-black tabular-nums text-rose-950">
                      {money(report.debt.outstandingAmount)}
                    </p>
                  </div>
                  <StatusBadge
                    tone={
                      report.debt.status === "OUTSTANDING"
                        ? "danger"
                        : "neutral"
                    }
                  >
                    {report.debt.status === "OUTSTANDING"
                      ? "Còn nợ"
                      : report.debt.status === "RECOVERED"
                        ? "Đã thu đủ"
                        : "Đã xóa nợ"}
                  </StatusBadge>
                </div>
                <p className="text-xs leading-5 text-rose-800">
                  Ban đầu {money(report.debt.originalAmount)} · đã thu{" "}
                  {money(report.debt.recoveredAmount)} · đã xóa{" "}
                  {money(report.debt.writtenOffAmount)}
                </p>
                {report.debt.status === "OUTSTANDING" &&
                  (report.debt.canWriteOff ? (
                    <div className="space-y-3 border-t border-rose-200 pt-3">
                      <div>
                        <label
                          htmlFor="absence-debt-writeoff-reason"
                          className="text-sm font-bold text-rose-950"
                        >
                          Lý do xóa khoản nợ
                        </label>
                        <p className="mt-1 text-xs leading-5 text-rose-800">
                          Bắt buộc ít nhất 10 ký tự và được lưu vào lịch sử xử
                          lý.
                        </p>
                      </div>
                      <Textarea
                        id="absence-debt-writeoff-reason"
                        value={writeOffReason}
                        onChange={(event) =>
                          setWriteOffReason(event.target.value)
                        }
                        rows={3}
                        maxLength={1000}
                        placeholder="Nhập lý do cụ thể..."
                        className="rounded-2xl bg-white"
                      />
                      <QuickTextSuggestions
                        value={writeOffReason}
                        onChange={setWriteOffReason}
                        suggestions={DEBT_WRITE_OFF_SUGGESTIONS}
                      />
                      <p className="text-xs text-rose-800" aria-live="polite">
                        {writeOffReason.trim().length < 10
                          ? `Cần thêm ${10 - writeOffReason.trim().length} ký tự để xác nhận.`
                          : "Đã đủ nội dung để xác nhận."}
                      </p>
                      <AdminButton
                        variant="danger"
                        disabled={
                          writeOff.isPending ||
                          writeOffReason.trim().length < 10
                        }
                        onClick={() =>
                          void writeOff.mutateAsync({
                            debtId: report.debt!.id,
                            reason: writeOffReason.trim(),
                          })
                        }
                      >
                        Xác nhận xóa khoản nợ còn lại
                      </AdminButton>
                    </div>
                  ) : (
                    <p className="border-t border-rose-200 pt-3 text-xs text-rose-800">
                      Có thể xóa nợ từ{" "}
                      {dateTime(report.debt.writeOffEligibleAt)}.
                    </p>
                  ))}
              </section>
            )}

            <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-4 text-sm">
              <p className="flex items-center gap-2 font-bold">
                <Clock3 className="size-4 text-amber-600" /> Thời hạn xử lý
              </p>
              <p
                className={`mt-3 text-xl font-black ${
                  report.slaRemainingMs <= 2 * 3_600_000
                    ? "text-rose-700"
                    : "text-[var(--c-ink)]"
                }`}
              >
                {report.slaRemainingMs > 0
                  ? `Còn ${Math.ceil(report.slaRemainingMs / 3_600_000)} giờ`
                  : "Đã quá hạn"}
              </p>
              <p className="mt-1 text-xs text-[var(--c-muted)]">
                Xử lý trước {dateTime(report.reviewDueAt)}
              </p>
            </div>

            {pending ? (
              <section className="space-y-3 rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-4">
                <div>
                  <label
                    htmlFor="absence-review-reason"
                    className="text-sm font-bold text-[var(--c-ink)]"
                  >
                    Ghi chú cho quyết định
                  </label>
                  <p className="mt-1 text-xs leading-5 text-[var(--c-muted)]">
                    Không bắt buộc khi duyệt. Cần ít nhất 10 ký tự khi từ chối.
                  </p>
                </div>
                <Textarea
                  id="absence-review-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Nhập điều đã kiểm tra hoặc lý do từ chối..."
                  className="rounded-2xl bg-white"
                />
                <QuickTextSuggestions
                  value={reason}
                  onChange={setReason}
                  suggestions={REVIEW_REASON_SUGGESTIONS}
                />
                <p className="text-xs text-[var(--c-muted)]" aria-live="polite">
                  {reason.trim().length === 0
                    ? "Có thể để trống nếu hồ sơ đủ điều kiện duyệt."
                    : reason.trim().length < 10
                      ? `Cần thêm ${10 - reason.trim().length} ký tự để có thể từ chối.`
                      : "Đã đủ nội dung để từ chối nếu cần."}
                </p>
              </section>
            ) : (
              <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-4">
                <p className="flex items-center gap-2 font-bold">
                  <ShieldCheck className="size-4 text-emerald-600" /> Kết quả đã
                  chốt
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--c-muted)]">
                  {report.reviewReason ?? "Không có ghi chú"}
                </p>
              </div>
            )}
          </aside>
        </div>
      )}
      {previewPhoto && (
        <PhotoLightbox
          photo={previewPhoto}
          onClose={() => setPreviewPhoto(null)}
        />
      )}
    </AdminDialog>
  );
}
