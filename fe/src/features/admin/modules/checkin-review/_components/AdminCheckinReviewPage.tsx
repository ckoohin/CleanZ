"use client";

import * as React from "react";
import {
  Camera,
  CheckCircle2,
  Clock3,
  MapPinned,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import {
  AdminButton,
  FilterTabs,
  PageHeader,
  StatCard,
  StatusBadge,
  type BadgeTone,
} from "@/components/admin";
import {
  BaseTableList,
  type Column,
  type RowAction,
} from "@/components/ui/base/base_table_list";
import { useAlerts } from "@/features/admin/hooks/useDashboard";
import { useAdminBookings } from "@/features/admin/modules/booking/hooks/useAdminBooking";
import { adminBookingService } from "@/features/admin/modules/booking/services/admin-booking.service";
import type {
  AdminBookingDetail,
  AdminBookingItem,
  AdminCheckinReviewStatus,
} from "@/features/admin/modules/booking/types/booking.types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AdminCheckinReviewDialog } from "./AdminCheckinReviewDialog";
import {
  CheckinLocationDialog,
  CheckinProofDialog,
} from "./CheckinEvidenceDialogs";

const ALL = "__all__" as const;

type ReviewFilter =
  typeof ALL | Exclude<AdminCheckinReviewStatus, "NOT_REQUIRED">;

const REVIEW_TABS: Array<{ key: ReviewFilter; label: string }> = [
  { key: "PENDING_REVIEW", label: "Chờ xử lý" },
  { key: "REJECTED", label: "Đã xác nhận vi phạm" },
  { key: "APPROVED", label: "Đã chấp nhận" },
  { key: "NOT_VERIFIABLE", label: "Không thể xác minh" },
  { key: ALL, label: "Tất cả đối soát" },
];

const REVIEW_META: Record<
  Exclude<AdminCheckinReviewStatus, "NOT_REQUIRED">,
  { label: string; tone: BadgeTone }
> = {
  PENDING_REVIEW: { label: "Chờ Admin duyệt", tone: "warning" },
  APPROVED: { label: "Đã chấp nhận", tone: "success" },
  REJECTED: { label: "Đã xác nhận vi phạm", tone: "danger" },
  NOT_VERIFIABLE: { label: "Không thể xác minh", tone: "neutral" },
};

const SOURCE_LABEL: Record<string, string> = {
  GPS_WITH_PROOF: "Ngoài bán kính",
  GPS_LOW_ACCURACY_WITH_PROOF: "GPS sai số lớn",
  NO_GPS_WITH_PROOF: "Không có GPS",
  TARGET_MISSING_WITH_PROOF: "Thiếu tọa độ đích",
  ADMIN_OVERRIDE: "Admin xác nhận thủ công",
};

const BOOKING_STATUS_META: Record<string, { label: string; tone: BadgeTone }> =
  {
    CHECKED_IN: { label: "Đã đến nơi", tone: "info" },
    IN_PROGRESS: { label: "Đang thực hiện", tone: "purple" },
    COMPLETED: { label: "Đã hoàn thành", tone: "success" },
    CANCELLED: { label: "Đã hủy", tone: "danger" },
    EXPIRED: { label: "Đã hết hạn", tone: "neutral" },
  };

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function AdminCheckinReviewPage() {
  const [reviewFilter, setReviewFilter] =
    React.useState<ReviewFilter>("PENDING_REVIEW");
  const [keyword, setKeyword] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [selectedBooking, setSelectedBooking] =
    React.useState<AdminBookingDetail | null>(null);
  const [isReviewOpen, setIsReviewOpen] = React.useState(false);
  const [proofBooking, setProofBooking] =
    React.useState<AdminBookingItem | null>(null);
  const [locationBooking, setLocationBooking] =
    React.useState<AdminBookingItem | null>(null);

  const { data, total, isLoading, mutate } = useAdminBookings({
    page,
    limit,
    keyword,
    farCheckin: true,
    checkinReviewStatus: reviewFilter === ALL ? undefined : reviewFilter,
  });
  const {
    data: alerts,
    isLoading: isAlertsLoading,
    refetch: refetchAlerts,
  } = useAlerts();

  React.useEffect(() => {
    setPage(1);
  }, [keyword, reviewFilter]);

  const openDetail = async (bookingId: string) => {
    try {
      const detail = await adminBookingService.getAdminBookingDetail(bookingId);
      setSelectedBooking(detail);
      setIsReviewOpen(true);
    } catch {
      toast.error("Không thể tải hồ sơ đối soát check-in");
    }
  };

  const columns: Column<AdminBookingItem>[] = [
    {
      key: "bookingCode",
      title: "Đơn hàng",
      render: (row) => (
        <div className="space-y-1">
          <div className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--c-primary-strong)]">
            {row.bookingCode}
          </div>
          <div className="max-w-44 truncate text-xs text-[var(--c-muted)]">
            {row.customer?.fullName ?? "Khách vãng lai"}
          </div>
        </div>
      ),
    },
    {
      key: "tasker",
      title: "Tasker",
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-[var(--c-ink)]">
            {row.tasker?.fullName ?? "Chưa xác định"}
          </div>
          <div className="text-xs text-[var(--c-muted)]">
            {row.tasker?.phone ?? "—"}
          </div>
        </div>
      ),
    },
    {
      key: "checkedInAt",
      title: "Thời điểm check-in",
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-medium text-[var(--c-ink)]">
            {formatDateTime(row.workTiming?.checkedInAt)}
          </div>
          <div className="max-w-44 truncate text-xs text-[var(--c-muted)]">
            {row.service?.name ?? "—"}
          </div>
        </div>
      ),
    },
    {
      key: "location",
      title: "Định vị",
      render: (row) => {
        const timing = row.workTiming;
        return (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setLocationBooking(row);
            }}
            className="space-y-1 rounded-lg p-1 text-left text-xs transition-colors hover:bg-amber-50"
          >
            <div className="font-semibold text-[var(--c-ink)]">
              {timing?.checkinVerificationSource
                ? (SOURCE_LABEL[timing.checkinVerificationSource] ??
                  timing.checkinVerificationSource)
                : "Chưa xác định nguồn"}
            </div>
            <div className="font-semibold text-amber-700 underline-offset-2 hover:underline">
              Mở map
            </div>
          </button>
        );
      },
    },
    {
      key: "proof",
      title: "Ảnh minh chứng",
      render: (row) =>
        row.workTiming?.checkinProofPhotoUrl ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setProofBooking(row);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--c-primary-strong)] hover:underline"
          >
            <Camera className="size-3.5" />
            Mở ảnh
          </button>
        ) : (
          <span className="text-xs text-[var(--c-muted)]">Không có ảnh</span>
        ),
    },
    {
      key: "bookingStatus",
      title: "Trạng thái đơn",
      hideOnMobile: true,
      render: (row) => {
        const meta = BOOKING_STATUS_META[row.status] ?? {
          label: row.status,
          tone: "neutral" as BadgeTone,
        };
        return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
      },
    },
    {
      key: "reviewStatus",
      title: "Đối soát",
      render: (row) => {
        const status = row.workTiming?.checkinReviewStatus;
        if (!status || status === "NOT_REQUIRED") {
          return <StatusBadge tone="neutral">Không thuộc hàng chờ</StatusBadge>;
        }
        const meta = REVIEW_META[status];
        return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
      },
    },
  ];

  const rowActions: RowAction<AdminBookingItem>[] = [
    {
      type: "view",
      label: "Xem và xử lý",
      onClick: (row) => openDetail(row.id),
    },
  ];

  const pendingCount = alerts?.pendingCheckinReviews.count ?? 0;
  const completedPendingCount =
    alerts?.pendingCheckinReviews.completedCount ?? 0;
  const tabs = REVIEW_TABS.map((tab) => ({
    ...tab,
    count: tab.key === "PENDING_REVIEW" ? pendingCount : undefined,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Đối soát check-in"
        description="Hàng chờ riêng cho check-in ngoài vùng, thiếu GPS hoặc GPS có sai số lớn. Đơn vẫn tiếp tục vận hành."
        actions={
          <AdminButton
            variant="secondary"
            icon={
              <RefreshCw
                className={cn(
                  "size-4",
                  (isLoading || isAlertsLoading) && "animate-spin",
                )}
              />
            }
            onClick={() => {
              void mutate();
              void refetchAlerts();
            }}
          >
            Làm mới
          </AdminButton>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={Clock3}
          label="Chờ xử lý"
          value={isAlertsLoading ? "…" : pendingCount}
          tint="#D97706"
        />
        <StatCard
          icon={ShieldAlert}
          label="Đã hoàn thành vẫn chờ duyệt"
          value={isAlertsLoading ? "…" : completedPendingCount}
          tint={completedPendingCount > 0 ? "#E11D48" : "#0E9F6E"}
        />
        <StatCard
          icon={CheckCircle2}
          label="Kết quả đang hiển thị"
          value={isLoading ? "…" : total}
          tint="#2563EB"
        />
      </div>

      {completedPendingCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" />
          <div>
            <div className="text-sm font-bold">
              {completedPendingCount} đơn đã hoàn thành nhưng GPS ngoài bán kính
            </div>
            
          </div>
        </div>
      )}

      <FilterTabs tabs={tabs} value={reviewFilter} onChange={setReviewFilter} />

      <BaseTableList
        columns={columns}
        data={data}
        rowKey="id"
        keyword={keyword}
        onKeywordChange={setKeyword}
        placeholderSearch="Tìm theo mã đơn, khách hàng hoặc Tasker..."
        rowActions={rowActions}
        totalItems={total}
        isLoading={isLoading}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(nextLimit) => {
          setLimit(nextLimit);
          setPage(1);
        }}
        emptyIcon={MapPinned}
        emptyTitle={
          reviewFilter === "PENDING_REVIEW"
            ? "Không còn check-in chờ xử lý"
            : "Không có hồ sơ đối soát phù hợp"
        }
        emptyDescription="Thử đổi trạng thái hoặc từ khóa tìm kiếm."
      />

      <AdminCheckinReviewDialog
        open={isReviewOpen}
        onOpenChange={setIsReviewOpen}
        booking={selectedBooking}
        onBookingUpdated={(updated) => {
          setSelectedBooking(updated);
          void mutate();
          void refetchAlerts();
        }}
      />

      <CheckinProofDialog
        open={Boolean(proofBooking)}
        onOpenChange={(open) => {
          if (!open) setProofBooking(null);
        }}
        bookingCode={proofBooking?.bookingCode}
        photoUrl={proofBooking?.workTiming?.checkinProofPhotoUrl}
      />

      <CheckinLocationDialog
        open={Boolean(locationBooking)}
        onOpenChange={(open) => {
          if (!open) setLocationBooking(null);
        }}
        bookingCode={locationBooking?.bookingCode}
        address={locationBooking?.address}
        checkedInAt={locationBooking?.workTiming?.checkedInAt}
        checkinLatitude={locationBooking?.workTiming?.checkinLatitude}
        checkinLongitude={locationBooking?.workTiming?.checkinLongitude}
        targetLatitude={locationBooking?.workTiming?.checkinTargetLatitude}
        targetLongitude={locationBooking?.workTiming?.checkinTargetLongitude}
        distanceMeters={locationBooking?.workTiming?.checkinDistanceMeters}
        accuracyMeters={locationBooking?.workTiming?.checkinAccuracyMeters}
      />
    </div>
  );
}
