"use client";

import React from "react";
import { CalendarCheck, ChevronRight, Clock, PackageX } from "lucide-react";
import { useMyBookingHistory } from "@/features/booking/hooks/useCustomerBooking";
import type { CustomerBookingDetail } from "@/features/booking/types/booking.types";

function fmtDate(d: string | null | undefined) {
  return d ? new Date(d).toLocaleDateString("vi-VN") : "—";
}

/**
 * Còn bao nhiêu giờ nữa hết hạn báo cáo cho một đơn.
 *
 * `completedAt` mới là mốc, KHÔNG phải ngày đặt hay ngày làm: backend tính hạn từ đúng
 * cột đó (`booking.completedAt + windowHours`). Lấy nhầm mốc thì màn hình hứa còn hạn
 * trong khi API đã đóng cửa — sai lệch mà khách chỉ phát hiện sau khi tải xong ảnh.
 */
function hoursLeft(
  completedAt: string | null | undefined,
  windowHours: number,
) {
  if (!completedAt) return null;
  const deadline = new Date(completedAt).getTime() + windowHours * 3_600_000;
  return (deadline - Date.now()) / 3_600_000;
}

export interface BookingPickerProps {
  /** Hạn thường; hết hạn này thì chỉ còn cửa cho sự cố nghiêm trọng. */
  reportWindowHours: number;
  /** Hạn rộng nhất; quá mốc này là chắc chắn không báo cáo được nữa. */
  reportWindowSevereHours: number;
  onPick: (booking: CustomerBookingDetail) => void;
}

/**
 * Chọn đơn để báo cáo sự cố.
 *
 * Trước đây màn hình này là một ô text trống và khách phải TỰ GÕ UUID của đơn — tính năng
 * chỉ dùng được nếu đi từ link có sẵn `?bookingId=`, mà không màn hình nào tạo ra link đó.
 * Danh sách ở đây lọc đúng tập đơn backend chấp nhận (`COMPLETED`) và nói rõ đơn nào đã
 * hết hạn, thay vì để `create()` từ chối sau khi khách khai xong toàn bộ thiệt hại.
 */
export function BookingPicker({
  reportWindowHours,
  reportWindowSevereHours,
  onPick,
}: BookingPickerProps) {
  const { data, isLoading } = useMyBookingHistory();

  const completed = (data?.items ?? [])
    .filter((b) => b.status === "COMPLETED" && b.completedAt)
    .sort(
      (a, b) =>
        new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime(),
    );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-border/50 bg-muted/40"
          />
        ))}
      </div>
    );
  }

  if (completed.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 p-6 text-center">
        <PackageX className="mx-auto mb-2 size-9 text-muted-foreground/40" />
        <p className="text-sm font-medium">Chưa có đơn nào đã hoàn thành</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Chỉ báo cáo sự cố được cho đơn đã hoàn thành.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {completed.map((b) => {
        const left = hoursLeft(b.completedAt, reportWindowHours);
        const leftSevere = hoursLeft(b.completedAt, reportWindowSevereHours);
        // Chỉ khoá khi qua cả cửa sổ RỘNG NHẤT. Trong khoảng giữa, thiệt hại lớn vẫn
        // được nhận — khoá sớm là tự chặn đúng nhóm sự cố nghiêm trọng nhất.
        const closed = leftSevere != null && leftSevere <= 0;
        const urgent = !closed && left != null && left <= 12;

        return (
          <button
            key={b.id}
            type="button"
            disabled={closed}
            onClick={() => onPick(b)}
            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
              closed
                ? "cursor-not-allowed border-border/40 opacity-55"
                : "border-border/50 hover:border-primary/40 hover:bg-primary/5"
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-primary">
                <CalendarCheck className="size-3" /> {b.bookingCode}
              </p>
              <p className="line-clamp-1 text-sm font-semibold">
                {b.service?.name ?? "Đơn dịch vụ"}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="size-3" /> Hoàn thành {fmtDate(b.completedAt)}
                {closed ? (
                  <span className="font-semibold text-muted-foreground">
                    · đã hết hạn báo cáo
                  </span>
                ) : left != null && left <= 0 ? (
                  <span className="font-semibold text-amber-600">
                    · quá hạn thường, chỉ nhận nếu thiệt hại nghiêm trọng
                  </span>
                ) : urgent ? (
                  <span className="font-semibold text-amber-600">
                    · còn {Math.max(1, Math.round(left!))} giờ
                  </span>
                ) : null}
              </p>
            </div>
            {!closed && (
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            )}
          </button>
        );
      })}
    </div>
  );
}
