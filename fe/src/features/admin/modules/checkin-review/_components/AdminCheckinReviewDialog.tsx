"use client";

import * as React from "react";
import {
  AlertTriangle,
  Camera,
  ExternalLink,
  Loader2,
  Lock,
  MapPinned,
  Navigation,
  ShieldCheck,
  User,
} from "lucide-react";
import { AdminButton, StatusBadge, type BadgeTone } from "@/components/admin";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useReviewBookingCheckin } from "@/features/admin/modules/booking/hooks/useAdminBooking";
import type {
  AdminBookingDetail,
  AdminCheckinReviewStatus,
} from "@/features/admin/modules/booking/types/booking.types";
import { useBanTasker } from "@/features/admin/modules/tasker/hooks/admin-tasker.hooks";
import type { BanType } from "@/features/admin/modules/tasker/types/admin-tasker.types";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { toast } from "sonner";
import {
  CheckinLocationDialog,
  CheckinProofDialog,
} from "./CheckinEvidenceDialogs";

interface AdminCheckinReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: AdminBookingDetail | null;
  onBookingUpdated: (booking: AdminBookingDetail) => void;
}

type ReviewDecision = "APPROVE" | "REJECT" | "MARK_NOT_VERIFIABLE";

interface ReviewReasonTemplate {
  label: string;
  value: string;
}

const CHECKIN_BAN_DEFAULT_DAYS = 7;
const CHECKIN_BAN_DURATION_PRESETS = [3, 7, 30] as const;
const TASKER_BAN_REASON_MAX_LENGTH = 488;
type CheckinBanDurationOption =
  (typeof CHECKIN_BAN_DURATION_PRESETS)[number] | "CUSTOM";

const REVIEW_REASON_TEMPLATES: Record<ReviewDecision, ReviewReasonTemplate[]> =
  {
    APPROVE: [
      {
        label: "GPS và ảnh phù hợp",
        value: "Vị trí GPS và ảnh hiện trường phù hợp với địa chỉ của khách.",
      },
      {
        label: "Khách xác nhận có mặt",
        value:
          "Khách hàng xác nhận Tasker đã có mặt tại địa điểm khi check-in.",
      },
      {
        label: "Sai số cao, ảnh đủ căn cứ",
        value:
          "GPS có sai số cao nhưng ảnh hiện trường đủ căn cứ xác nhận Tasker có mặt.",
      },
    ],
    REJECT: [
      {
        label: "Sai vị trí, ảnh không đủ",
        value:
          "Vị trí check-in không khớp điểm đến và ảnh không đủ căn cứ xác nhận Tasker có mặt.",
      },
      {
        label: "Ảnh không đúng hiện trường",
        value:
          "Ảnh bằng chứng không thể hiện đúng hiện trường tại địa chỉ của khách.",
      },
      {
        label: "Khách xác nhận chưa đến",
        value:
          "Khách hàng xác nhận Tasker chưa có mặt tại địa điểm khi thực hiện check-in.",
      },
    ],
    MARK_NOT_VERIFIABLE: [
      {
        label: "Thiếu GPS và ảnh",
        value: "Thiếu dữ liệu GPS và ảnh không đủ rõ để đưa ra kết luận.",
      },
      {
        label: "Dữ liệu cũ thiếu sai số",
        value:
          "Dữ liệu check-in cũ không ghi nhận sai số GPS nên chưa đủ căn cứ kết luận.",
      },
      {
        label: "Thông tin không thống nhất",
        value:
          "Dữ liệu GPS, ảnh và xác nhận của các bên không thống nhất, chưa đủ căn cứ kết luận.",
      },
    ],
  };

const REVIEW_META: Record<
  AdminCheckinReviewStatus,
  { label: string; tone: BadgeTone }
> = {
  NOT_REQUIRED: { label: "Không cần hậu kiểm", tone: "success" },
  PENDING_REVIEW: { label: "Chờ Admin duyệt", tone: "warning" },
  APPROVED: { label: "Đã chấp nhận", tone: "success" },
  REJECTED: { label: "Đã xác nhận vi phạm", tone: "danger" },
  NOT_VERIFIABLE: { label: "Không thể xác minh", tone: "neutral" },
};

const SOURCE_LABEL: Record<string, string> = {
  GPS: "GPS trong bán kính",
  GPS_WITH_PROOF: "GPS ngoài bán kính + ảnh",
  GPS_LOW_ACCURACY_WITH_PROOF: "GPS sai số lớn + ảnh",
  NO_GPS_WITH_PROOF: "Không có GPS + ảnh",
  TARGET_MISSING_WITH_PROOF: "Địa chỉ thiếu tọa độ + ảnh",
  ADMIN_OVERRIDE: "Admin xác nhận thủ công",
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatMeters(value?: number | null) {
  if (value == null) return "Không có dữ liệu";
  return `${Math.round(value)} m`;
}

function buildCheckinBanReason(bookingRef: string, reviewReason: string) {
  const reason = `Vi phạm check-in ${bookingRef}: ${reviewReason}`;
  if (reason.length <= TASKER_BAN_REASON_MAX_LENGTH) return reason;
  return `${reason.slice(0, TASKER_BAN_REASON_MAX_LENGTH - 3).trimEnd()}...`;
}

function ReviewContent({
  booking,
  onBookingUpdated,
}: {
  booking: AdminBookingDetail;
  onBookingUpdated: (booking: AdminBookingDetail) => void;
}) {
  const reviewMutation = useReviewBookingCheckin();
  const banMutation = useBanTasker();
  const [decision, setDecision] = React.useState<ReviewDecision>("APPROVE");
  const [reason, setReason] = React.useState("");
  const [openIncident, setOpenIncident] = React.useState(false);
  const [claimedAmount, setClaimedAmount] = React.useState("");
  const [lockTaskerAccount, setLockTaskerAccount] = React.useState(false);
  const [banType, setBanType] = React.useState<BanType>("TEMPORARY");
  const [banDurationOption, setBanDurationOption] =
    React.useState<CheckinBanDurationOption>(CHECKIN_BAN_DEFAULT_DAYS);
  const [banDurationDays, setBanDurationDays] = React.useState(
    CHECKIN_BAN_DEFAULT_DAYS,
  );
  const [isPhotoOpen, setIsPhotoOpen] = React.useState(false);
  const [isLocationOpen, setIsLocationOpen] = React.useState(false);

  const timing = booking.operation?.workTiming;
  if (!timing) return null;

  const reviewMeta = REVIEW_META[timing.checkinReviewStatus];
  const canOpenIncident = Boolean(booking.customer?.id && booking.tasker?.id);
  const canLockTaskerAccount = Boolean(booking.tasker?.id);
  const isSubmitting = reviewMutation.isPending || banMutation.isPending;

  const parseClaimedAmount = () => {
    const amount = Number(claimedAmount);
    return Number.isInteger(amount) && amount > 0 ? amount : null;
  };

  const selectBanDurationOption = (option: CheckinBanDurationOption) => {
    setBanDurationOption(option);
    if (option !== "CUSTOM") setBanDurationDays(option);
  };

  const submitReview = () => {
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 3) {
      toast.error("Vui lòng nhập căn cứ đối soát ít nhất 3 ký tự");
      return;
    }

    const amount =
      decision === "REJECT" && openIncident ? parseClaimedAmount() : null;
    if (decision === "REJECT" && openIncident && amount == null) {
      toast.error("Vui lòng nhập số tiền yêu cầu bồi thường hợp lệ");
      return;
    }

    if (decision === "REJECT" && lockTaskerAccount && !canLockTaskerAccount) {
      toast.error("Booking không có Tasker hợp lệ để khóa tài khoản");
      return;
    }

    const banPayload =
      decision === "REJECT" && lockTaskerAccount && booking.tasker?.id
        ? {
            id: booking.tasker.id,
            reason: buildCheckinBanReason(
              booking.bookingCode ?? booking.id,
              normalizedReason,
            ),
            type: banType,
            durationDays: banType === "TEMPORARY" ? banDurationDays : undefined,
          }
        : null;

    reviewMutation.mutate(
      {
        id: booking.id,
        payload: {
          decision,
          reason: normalizedReason,
          openIncident: decision === "REJECT" && openIncident,
          claimedAmount: amount ?? undefined,
        },
      },
      {
        onSuccess: (updated: AdminBookingDetail) => {
          onBookingUpdated(updated);
          if (banPayload) {
            toast.success("Đã lưu kết luận; đang khóa tài khoản Tasker");
            banMutation.mutate(banPayload);
            return;
          }
          toast.success(
            decision === "REJECT" && openIncident
              ? "Đã kết luận và mở Incident"
              : "Đã lưu kết quả đối soát check-in",
          );
        },
        onError: (error: unknown) => {
          toast.error(
            getApiErrorMessage(error, "Không thể lưu kết quả đối soát"),
          );
        },
      },
    );
  };

  const openIncidentAfterReview = () => {
    const amount = parseClaimedAmount();
    const reviewReason = timing.checkinReviewReason?.trim();
    if (!reviewReason || reviewReason.length < 3) {
      toast.error("Kết quả đối soát chưa có căn cứ hợp lệ");
      return;
    }
    if (amount == null) {
      toast.error("Vui lòng nhập số tiền yêu cầu bồi thường hợp lệ");
      return;
    }

    reviewMutation.mutate(
      {
        id: booking.id,
        payload: {
          decision: "REJECT",
          reason: reviewReason,
          openIncident: true,
          claimedAmount: amount,
        },
      },
      {
        onSuccess: (updated: AdminBookingDetail) => {
          onBookingUpdated(updated);
          toast.success("Đã mở Incident từ kết quả đối soát");
        },
        onError: (error: unknown) => {
          toast.error(getApiErrorMessage(error, "Không thể mở Incident"));
        },
      },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">
          <ShieldCheck className="size-5 text-amber-500" />
          Hồ sơ đối soát check-in
          <span className="font-mono text-sm text-[var(--c-muted)]">
            · {booking.bookingCode ?? booking.id}
          </span>
        </DialogTitle>
      </DialogHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--c-muted)]">
            <User className="size-3.5" /> Tasker
          </div>
          <div className="mt-1 text-sm font-bold text-[var(--c-ink)]">
            {booking.tasker?.fullName ?? "Chưa xác định"}
          </div>
          <div className="text-xs text-[var(--c-muted)]">
            {booking.tasker?.phone ?? "Không có số điện thoại"}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--c-muted)]">
            <User className="size-3.5" /> Khách hàng
          </div>
          <div className="mt-1 text-sm font-bold text-[var(--c-ink)]">
            {booking.customer?.fullName ?? "Khách vãng lai"}
          </div>
          <div className="text-xs text-[var(--c-muted)]">
            {booking.address?.fullAddress ?? "Không có địa chỉ"}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold">
              <Navigation className="size-4 text-amber-500" />
              Bằng chứng tại thời điểm check-in
            </div>
            <div className="mt-1 text-xs text-[var(--c-muted)]">
              {formatDateTime(timing.checkedInAt)}
            </div>
          </div>
          <StatusBadge tone={reviewMeta.tone}>{reviewMeta.label}</StatusBadge>
        </div>

        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
          <div className="rounded-lg bg-[var(--c-card)] p-2.5">
            <span className="block text-[var(--c-muted)]">Khoảng cách</span>
            <strong>{formatMeters(timing.checkinDistanceMeters)}</strong>
          </div>
          <div className="rounded-lg bg-[var(--c-card)] p-2.5">
            <span className="block text-[var(--c-muted)]">Sai số GPS</span>
            <strong>{formatMeters(timing.checkinAccuracyMeters)}</strong>
          </div>
          <div className="rounded-lg bg-[var(--c-card)] p-2.5">
            <span className="block text-[var(--c-muted)]">Nguồn xác minh</span>
            <strong>
              {timing.checkinVerificationSource
                ? (SOURCE_LABEL[timing.checkinVerificationSource] ??
                  timing.checkinVerificationSource)
                : "Không xác định"}
            </strong>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <AdminButton
            variant="secondary"
            icon={<MapPinned className="size-4" />}
            onClick={() => setIsLocationOpen(true)}
            className="justify-center"
          >
            Kiểm tra vị trí
          </AdminButton>
          <AdminButton
            variant="secondary"
            icon={<Camera className="size-4" />}
            onClick={() => setIsPhotoOpen(true)}
            disabled={!timing.checkinProofPhotoUrl}
            className="justify-center"
          >
            {timing.checkinProofPhotoUrl
              ? "Xem ảnh bằng chứng"
              : "Không có ảnh"}
          </AdminButton>
        </div>
      </div>

      {timing.checkinReviewStatus === "PENDING_REVIEW" && (
        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div>
            <div className="text-sm font-bold text-amber-900">
              Kết luận đối soát
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              ["APPROVE", "Chấp nhận"],
              ["REJECT", "Vi phạm"],
              ["MARK_NOT_VERIFIABLE", "Không xác minh"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setDecision(value as ReviewDecision);
                  setReason("");
                  if (value !== "REJECT") {
                    setOpenIncident(false);
                    setLockTaskerAccount(false);
                  }
                }}
                className={
                  decision === value
                    ? "rounded-lg border border-amber-500 bg-amber-500 px-2 py-2 text-xs font-bold text-white"
                    : "rounded-lg border border-amber-200 bg-white px-2 py-2 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100"
                }
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
              Điền nhanh theo kết luận
            </div>
            <div className="flex flex-wrap gap-1.5">
              {REVIEW_REASON_TEMPLATES[decision].map((template) => {
                const selected = reason === template.value;
                return (
                  <button
                    key={template.label}
                    type="button"
                    aria-pressed={selected}
                    title={template.value}
                    onClick={() => setReason(template.value)}
                    className={
                      selected
                        ? "rounded-full border border-amber-500 bg-amber-500 px-2.5 py-1.5 text-[11px] font-semibold text-white"
                        : "rounded-full border border-amber-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-amber-900 transition-colors hover:border-amber-500 hover:bg-amber-100"
                    }
                  >
                    {template.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={1000}
            placeholder="Ghi rõ căn cứ: vị trí, sai số GPS, nội dung ảnh, xác nhận từ khách..."
            className="min-h-24 bg-white"
          />

          {decision === "REJECT" && (
            <div className="space-y-2 rounded-lg border border-red-200 bg-white p-3">
              <label className="flex items-start gap-2 text-xs text-red-900">
                <input
                  type="checkbox"
                  checked={openIncident}
                  disabled={!canOpenIncident}
                  onChange={(event) => setOpenIncident(event.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Mở Incident để xử lý trách nhiệm/bồi thường
                  {!canOpenIncident &&
                    " (booking phải có customer và Tasker hợp lệ)"}
                </span>
              </label>
              {openIncident && (
                <Input
                  type="number"
                  min={1}
                  max={20_000_000}
                  step={1000}
                  value={claimedAmount}
                  onChange={(event) => setClaimedAmount(event.target.value)}
                  placeholder="Số tiền yêu cầu ban đầu (VND)"
                />
              )}
              <p className="text-[10px] leading-relaxed text-red-700">
                Chuyển cho bộ phận xử lý vi phạm để xác minh và yêu cầu bồi thường (nếu có).
              </p>

              <div className="border-t border-red-100 pt-3">
                <label className="flex items-start gap-2 text-xs text-red-900">
                  <input
                    type="checkbox"
                    checked={lockTaskerAccount}
                    disabled={!canLockTaskerAccount}
                    onChange={(event) =>
                      setLockTaskerAccount(event.target.checked)
                    }
                    className="mt-0.5"
                  />
                  <span className="space-y-0.5">
                    <span className="flex items-center gap-1 font-semibold">
                      <Lock className="size-3.5" />
                      Khóa tài khoản Tasker
                    </span>
                    
                  </span>
                </label>

                {lockTaskerAccount && (
                  <div className="mt-3 space-y-2 rounded-lg border border-red-100 bg-red-50 p-3">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["TEMPORARY", "Tạm khóa"],
                        ["PERMANENT", "Vĩnh viễn"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setBanType(value as BanType)}
                          className={
                            banType === value
                              ? "rounded-lg border border-red-500 bg-red-500 px-2 py-2 text-xs font-bold text-white"
                              : "rounded-lg border border-red-200 bg-white px-2 py-2 text-xs font-semibold text-red-900 transition-colors hover:bg-red-100"
                          }
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {banType === "TEMPORARY" && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            ...CHECKIN_BAN_DURATION_PRESETS.map((days) => ({
                              label: `${days} ngày`,
                              value: days,
                            })),
                            { label: "Tự nhập", value: "CUSTOM" as const },
                          ].map((option) => {
                            const selected = banDurationOption === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                aria-pressed={selected}
                                onClick={() =>
                                  selectBanDurationOption(option.value)
                                }
                                className={
                                  selected
                                    ? "rounded-lg border border-red-500 bg-white px-2 py-2 text-[11px] font-bold text-red-700"
                                    : "rounded-lg border border-red-200 bg-white/70 px-2 py-2 text-[11px] font-semibold text-red-900 transition-colors hover:bg-white"
                                }
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>

                        {banDurationOption === "CUSTOM" && (
                          <Input
                            type="number"
                            min={1}
                            max={365}
                            value={banDurationDays}
                            onChange={(event) => {
                              const value = Number(event.target.value);
                              if (Number.isNaN(value)) return;
                              setBanDurationDays(
                                Math.min(365, Math.max(1, Math.floor(value))),
                              );
                            }}
                            placeholder="Nhập số ngày khóa"
                            className="bg-white"
                          />
                        )}
                      </div>
                    )}

                    <p className="text-[10px] leading-relaxed text-red-700">
                      Lý do khóa sẽ lấy từ căn cứ đối soát. Tạm khóa chuyển
                      Tasker sang SUSPENDED; vĩnh viễn chuyển sang TERMINATED và
                      vô hiệu đăng nhập.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <AdminButton
            variant={decision === "REJECT" ? "danger" : "primary"}
            onClick={submitReview}
            disabled={isSubmitting}
            className="w-full justify-center"
          >
            {isSubmitting && <Loader2 className="mr-1 size-4 animate-spin" />}
            {isSubmitting ? "Đang xử lý..." : "Lưu kết luận đối soát"}
          </AdminButton>
        </div>
      )}

      {timing.checkinReviewStatus !== "PENDING_REVIEW" &&
        timing.checkinReviewReason && (
          <div className="rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-4">
            <div className="text-xs font-semibold text-[var(--c-muted)]">
              Kết luận bởi {timing.checkinReviewedByAdmin?.fullName ?? "Admin"}{" "}
              · {formatDateTime(timing.checkinReviewedAt)}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--c-ink)]">
              {timing.checkinReviewReason}
            </p>
          </div>
        )}

      {timing.checkinReviewStatus === "REJECTED" &&
        !timing.checkinIncident &&
        canOpenIncident && (
          <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-2 text-red-900">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div>
                <div className="text-sm font-bold">
                  Vi phạm chưa có Incident
                </div>
                <p className="text-xs">
                  Có thể mở hồ sơ riêng để tiếp tục xác minh và xử lý cọc/ví
                  Tasker.
                </p>
              </div>
            </div>
            <Input
              type="number"
              min={1}
              max={20_000_000}
              step={1000}
              value={claimedAmount}
              onChange={(event) => setClaimedAmount(event.target.value)}
              placeholder="Số tiền yêu cầu ban đầu (VND)"
              className="bg-white"
            />
            <AdminButton
              variant="danger"
              onClick={openIncidentAfterReview}
              disabled={reviewMutation.isPending}
              className="w-full justify-center"
            >
              {reviewMutation.isPending
                ? "Đang mở hồ sơ..."
                : "Mở Incident xử lý vi phạm"}
            </AdminButton>
          </div>
        )}

      {timing.checkinIncident && (
        <a
          href={`/admin/incidents?incidentId=${timing.checkinIncident.id}`}
          className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          <span>
            Incident{" "}
            {timing.checkinIncident.incidentCode ??
              timing.checkinIncident.id.slice(0, 8)}
          </span>
          <ExternalLink className="size-4" />
        </a>
      )}

      <CheckinProofDialog
        open={isPhotoOpen}
        onOpenChange={setIsPhotoOpen}
        bookingCode={booking.bookingCode}
        photoUrl={timing.checkinProofPhotoUrl}
      />
      <CheckinLocationDialog
        open={isLocationOpen}
        onOpenChange={setIsLocationOpen}
        bookingCode={booking.bookingCode}
        address={booking.address?.fullAddress}
        checkedInAt={timing.checkedInAt ?? booking.operation?.checkedInAt}
        checkinLatitude={timing.checkinLatitude}
        checkinLongitude={timing.checkinLongitude}
        targetLatitude={timing.checkinTargetLatitude}
        targetLongitude={timing.checkinTargetLongitude}
        distanceMeters={timing.checkinDistanceMeters}
        accuracyMeters={timing.checkinAccuracyMeters}
      />
    </>
  );
}

export function AdminCheckinReviewDialog({
  open,
  onOpenChange,
  booking,
  onBookingUpdated,
}: AdminCheckinReviewDialogProps) {
  const reviewStatus =
    booking?.operation?.workTiming.checkinReviewStatus ?? "PENDING_REVIEW";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="cz-admin max-h-[92dvh] max-w-4xl overflow-y-auto bg-[var(--c-card)] text-[var(--c-ink)]">
        {booking ? (
          <ReviewContent
            key={`${booking.id}:${reviewStatus}`}
            booking={booking}
            onBookingUpdated={onBookingUpdated}
          />
        ) : (
          <div className="grid min-h-52 place-items-center">
            <Loader2 className="size-6 animate-spin text-amber-500" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
