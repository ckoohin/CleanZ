"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FileText,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getReviewPartMap } from "@/lib/kyc/review-notes";
import { TaskerJobListPage } from "@/features/booking/_components/TaskerJobListPage";
import { useTaskerActiveBooking } from "@/features/booking/hooks/useTaskerBooking";
import { useTaskerProfile } from "@/features/tasker/hooks/tasker.hooks";
import { TaskerStatus } from "@/features/tasker/types/tasker.type";
import type {
  BookingStatus,
  TaskerAssignedBookingDetail,
} from "@/features/booking/types/booking.types";

const ACTIVE_STATUS_LABELS: Partial<Record<BookingStatus, string>> = {
  PENDING_CUSTOMER_CONFIRMATION: "Chờ khách xác nhận",
  CONFIRMED: "Đã nhận công việc",
  TASKER_ON_THE_WAY: "Đang đến địa điểm",
  CHECKED_IN: "Đã có mặt",
  IN_PROGRESS: "Đang thực hiện",
};

const ACTIVE_ACTION_LABELS: Partial<Record<BookingStatus, string>> = {
  PENDING_CUSTOMER_CONFIRMATION: "Xem trạng thái",
  CONFIRMED: "Tiếp tục để di chuyển",
  TASKER_ON_THE_WAY: "Tiếp tục để check-in",
  CHECKED_IN: "Tiếp tục để bắt đầu",
  IN_PROGRESS: "Tiếp tục công việc",
};

function formatSchedule(booking: TaskerAssignedBookingDetail) {
  const rawDate = booking.schedule.scheduledStartDate;
  const date = rawDate
    ? new Date(`${rawDate}T00:00:00`).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "Chưa có ngày";
  const time = booking.schedule.scheduledStartTime ?? "Chưa có giờ";
  return `${time} · ${date}`;
}

function ActiveJobCard() {
  const { data: booking, isLoading } = useTaskerActiveBooking();

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" />;
  }

  if (!booking) return null;

  const statusLabel = ACTIVE_STATUS_LABELS[booking.status] ?? "Đang xử lý";
  const actionLabel = ACTIVE_ACTION_LABELS[booking.status] ?? "Xem công việc";
  const address = booking.address?.fullAddress || booking.area?.displayAddress;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-card to-card shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b border-orange-500/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-orange-400 opacity-70" />
            <span className="relative inline-flex size-2.5 rounded-full bg-orange-500" />
          </span>
          <p className="text-sm font-black uppercase tracking-wide text-orange-700">
            Công việc đang thực hiện
          </p>
        </div>
        <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-700">
          {statusLabel}
        </span>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-lg font-black">{booking.service.name}</p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              Mã đơn {booking.bookingCode}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] text-muted-foreground">Giá trị đơn</p>
            <p className="font-black text-primary">
              {Number(booking.price.totalPrice).toLocaleString("vi-VN")}đ
            </p>
          </div>
        </div>

        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 shrink-0 text-orange-600" aria-hidden="true" />
            <span>{formatSchedule(booking)}</span>
          </div>
          {address && (
            <div className="flex min-w-0 items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-orange-600" aria-hidden="true" />
              <span className="line-clamp-2">{address}</span>
            </div>
          )}
        </div>

        <Button asChild className="h-12 w-full rounded-xl font-bold">
          <Link href={`/tasker/jobs/${booking.id}`}>
            {actionLabel}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </motion.section>
  );
}

function ProfileCompletionCard({
  tasker,
}: {
  tasker: NonNullable<ReturnType<typeof useTaskerProfile>["data"]>;
}) {
  const reviewMap = getReviewPartMap(tasker.adminNotes);
  const checks = [
    { id: "citizenCard", label: "Ảnh CCCD", done: !!tasker.hasCitizenCardImage },
    { id: "idWithSelfie", label: "Ảnh selfie + CCCD", done: !!tasker.hasIdWithSelfieImage },
    { id: "criminalRecord", label: "Lý lịch tư pháp", done: !!tasker.hasCriminalRecordImage },
    { id: "healthCertificate", label: "Giấy khám sức khoẻ", done: !!tasker.hasHealthCertificateImage },
    { id: "phone", label: "Số điện thoại", done: !!tasker.phone },
    { id: "address", label: "Địa chỉ hiện tại", done: !!tasker.addressCurrent },
    { id: "bankInfo", label: "Thông tin ngân hàng", done: !!tasker.bankName },
  ];
  const completed = checks.filter((check) => check.done).length;
  const progress = Math.round((completed / checks.length) * 100);

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Hoàn thiện hồ sơ</h2>
        <span className="text-sm font-black text-primary">{progress}%</span>
      </div>
      <Progress value={progress} className="h-2" />
      <div className="grid gap-2 sm:grid-cols-2">
        {checks.map((check) => {
          const flagged = reviewMap[check.id];
          return (
            <div key={check.id} className="flex items-center gap-2 text-sm">
              {flagged ? (
                <AlertCircle className="size-4 shrink-0 text-red-600" aria-hidden="true" />
              ) : check.done ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
              ) : (
                <AlertCircle className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              <span
                className={cn(
                  flagged
                    ? "font-medium text-red-600"
                    : check.done
                      ? "text-foreground"
                      : "text-muted-foreground",
                )}
              >
                {check.label}
              </span>
            </div>
          );
        })}
      </div>
      <Button asChild variant="outline" className="h-11 w-full rounded-xl">
        <Link href="/tasker/profile">Cập nhật thông tin cá nhân</Link>
      </Button>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
      <div className="h-40 animate-pulse rounded-3xl bg-muted" />
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  );
}

export default function TaskerPage() {
  const { data: tasker, isLoading } = useTaskerProfile();
  const isVerified = tasker?.approvalStatus === TaskerStatus.APPROVED;
  const isOnline = tasker?.presenceStatus === "ONLINE";

  return (
    <>
      <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-8">
        <header>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Công việc <span className="text-primary">dành cho bạn</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Danh sách đơn hàng sẽ hiển thị ở đây
            </p>
          </div>
        </header>

        {isLoading ? (
          <HomeSkeleton />
        ) : tasker ? (
          <div className="space-y-5">
            {isVerified && !isOnline && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-700"
              >
                <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-bold">Bạn đang Offline</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-red-600/80">
                    Bật Online bằng nút nổi phía dưới để sẵn sàng nhận công việc mới.
                  </p>
                </div>
              </div>
            )}

            {isVerified ? (
              <>
                <ActiveJobCard />
                <TaskerJobListPage embedded />
              </>
            ) : (
              <ProfileCompletionCard tasker={tasker} />
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
            <FileText className="mx-auto size-10 text-muted-foreground/50" aria-hidden="true" />
            <h2 className="mt-3 font-bold">Hoàn thiện hồ sơ để nhận đơn</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sau khi hồ sơ được duyệt, danh sách công việc sẽ xuất hiện tại đây.
            </p>
            <Button asChild className="mt-4 rounded-xl">
              <Link href="/tasker/onboarding">Nộp hồ sơ ngay</Link>
            </Button>
          </div>
        )}
      </div>

    </>
  );
}
