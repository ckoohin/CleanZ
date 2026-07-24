"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Heart,
  Loader2,
  Phone,
  Star,
  UserRoundCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  FavoriteTasker,
  FavoriteTaskerAvailability,
} from "@/features/booking/types/booking.types";
import {
  useFavoriteTaskerAvailability,
  useFavoriteTaskerContact,
  useFavoriteTaskers,
} from "@/features/customer/hooks/useFavoriteTasker";

interface FavoriteTaskerPickerProps {
  value?: string;
  onChange: (taskerId: string | undefined) => void;
  scheduledDate?: string;
  scheduledTime?: string;
  durationHours?: number;
}

function isAvailabilityItem(
  tasker: FavoriteTasker | FavoriteTaskerAvailability,
): tasker is FavoriteTaskerAvailability {
  return "availability" in tasker;
}

export function FavoriteTaskerPicker({
  value,
  onChange,
  scheduledDate = "",
  scheduledTime = "",
  durationHours = 0,
}: FavoriteTaskerPickerProps) {
  const [open, setOpen] = useState(false);
  const hasSchedule =
    !!scheduledDate && !!scheduledTime && Number(durationHours) > 0;
  const shouldLoadList = open || !!value;

  const availabilityQuery = useFavoriteTaskerAvailability(
    { scheduledDate, scheduledTime, durationHours },
    shouldLoadList && hasSchedule,
  );
  const favoritesQuery = useFavoriteTaskers(shouldLoadList && !hasSchedule);
  const contactQuery = useFavoriteTaskerContact(value, !!value);

  const favorites = hasSchedule
    ? (availabilityQuery.data ?? [])
    : (favoritesQuery.data ?? []);
  const isLoading = hasSchedule
    ? availabilityQuery.isLoading
    : favoritesQuery.isLoading;
  const hasError = hasSchedule
    ? availabilityQuery.isError
    : favoritesQuery.isError;
  const selectedTasker = favorites.find(
    (favorite) => favorite.taskerId === value,
  );
  const selectedAvailability =
    selectedTasker && isAvailabilityItem(selectedTasker)
      ? selectedTasker.availability
      : null;

  const handleSelect = (
    favorite: FavoriteTasker | FavoriteTaskerAvailability,
  ) => {
    const isScheduleAvailable =
      !isAvailabilityItem(favorite) || favorite.availability.isAvailable;
    if (!favorite.isPremiumEligible || !isScheduleAvailable) return;

    onChange(favorite.taskerId);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-amber-500/30 bg-background p-3 text-left transition-colors hover:border-amber-500/60 hover:bg-amber-500/5"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <UserRoundCheck className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-foreground">
              Tasker của bạn
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {selectedTasker?.fullName ??
                (value
                  ? "Đang tải Tasker đã chọn…"
                  : "Chọn trong danh sách Tasker đã yêu thích")}
            </p>
          </div>
          {value ? (
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
          ) : (
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
          )}
        </div>
      </button>

      {value && (
        <>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <Phone className="size-4 shrink-0" />
              {contactQuery.isLoading ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="size-3 animate-spin" />
                  Đang tải số điện thoại…
                </span>
              ) : contactQuery.data?.phone ? (
                <a
                  href={`tel:${contactQuery.data.phone}`}
                  className="underline underline-offset-2"
                >
                  {contactQuery.data.phone}
                </a>
              ) : (
                <span>
                  {contactQuery.isError
                    ? "Không thể tải số điện thoại. Vui lòng thử lại."
                    : "Tasker chưa cập nhật số điện thoại."}
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-emerald-700">
              Bạn có thể liên hệ trước để xác nhận lịch hẹn
            </p>
          </div>

          {selectedAvailability?.message && (
            <div
              className={cn(
                "flex items-start gap-2 rounded-xl border p-3 text-xs",
                selectedAvailability.isAvailable
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-red-200 bg-red-50 text-red-700",
              )}
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{selectedAvailability.message}</span>
            </div>
          )}
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88dvh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-2xl p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border/60 px-5 pb-4 pt-5 text-left">
            <DialogTitle>Chọn Tasker của bạn</DialogTitle>
            <DialogDescription>
              Danh sách Tasker bạn đã yêu thích và tình trạng lịch tại khung giờ
              đang đặt.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 overflow-y-auto px-4 pb-5">
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
                className="mb-3 w-full rounded-xl border border-border/60 px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/50"
              >
                Không chọn Tasker cụ thể
              </button>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                Đang kiểm tra lịch Tasker…
              </div>
            ) : hasError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Không thể kiểm tra lịch Tasker. Vui lòng đóng và thử lại.
              </div>
            ) : favorites.length === 0 ? (
              <div className="py-10 text-center">
                <Heart className="mx-auto mb-3 size-8 text-muted-foreground/50" />
                <p className="text-sm font-semibold text-foreground">
                  Bạn chưa có Tasker yêu thích
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sau khi hoàn thành đơn, hãy lưu Tasker phù hợp để chọn cho lần
                  đặt tiếp theo.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {favorites.map((favorite) => {
                  const availability = isAvailabilityItem(favorite)
                    ? favorite.availability
                    : null;
                  const isScheduleAvailable = availability?.isAvailable ?? true;
                  const selectable =
                    favorite.isPremiumEligible && isScheduleAvailable;
                  const selected = favorite.taskerId === value;
                  const isTight = availability?.status === "TIGHT_SCHEDULE";

                  return (
                    <button
                      key={favorite.taskerId}
                      type="button"
                      disabled={!selectable}
                      onClick={() => handleSelect(favorite)}
                      className={cn(
                        "w-full rounded-2xl border p-4 text-left transition-all",
                        selected
                          ? "border-amber-500 bg-amber-500/10 shadow-sm"
                          : selectable
                            ? "border-border/60 bg-card hover:border-amber-500/50 hover:bg-amber-500/5 active:scale-[0.99]"
                            : "cursor-not-allowed border-border/40 bg-muted/40 opacity-75",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                          {favorite.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={favorite.avatarUrl}
                              alt={favorite.fullName ?? "Tasker"}
                              className="size-full object-cover"
                            />
                          ) : (
                            <Heart className="size-5 text-muted-foreground" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-bold text-foreground">
                              {favorite.fullName ?? "Tasker CleanZ"}
                            </span>
                            {favorite.presenceStatus === "ONLINE" && (
                              <span className="text-[11px] font-semibold text-emerald-600">
                                Đang online
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-0.5">
                              <Star className="size-3 fill-amber-500 text-amber-500" />
                              {favorite.ratingAvg.toFixed(1)}
                            </span>
                            <span>
                              Đã làm {favorite.completedJobsForCustomer} đơn cho
                              bạn
                            </span>
                          </div>

                          <div
                            className={cn(
                              "mt-2 inline-flex items-center gap-1 text-[11px] font-semibold",
                              !favorite.isPremiumEligible
                                ? "text-amber-700"
                                : !isScheduleAvailable
                                  ? "text-red-600"
                                  : isTight
                                    ? "text-amber-700"
                                    : "text-emerald-600",
                            )}
                          >
                            {!favorite.isPremiumEligible ? (
                              <>
                                <AlertTriangle className="size-3.5" />
                                Bộ dụng cụ chưa được admin duyệt
                              </>
                            ) : !isScheduleAvailable ? (
                              <>
                                <CalendarClock className="size-3.5" />
                                Bận trong khung giờ này
                              </>
                            ) : isTight ? (
                              <>
                                <AlertTriangle className="size-3.5" />
                                Lịch sát ca khác
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="size-3.5" />
                                Có thể nhận lịch
                              </>
                            )}
                          </div>

                          {availability?.message && (
                            <p
                              className={cn(
                                "mt-1.5 text-[11px] leading-relaxed",
                                availability.isAvailable
                                  ? "text-amber-700"
                                  : "text-red-600",
                              )}
                            >
                              {availability.message}
                            </p>
                          )}
                        </div>

                        {selected && (
                          <CheckCircle2 className="size-5 shrink-0 text-amber-600" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-[11px] text-muted-foreground">
              <Clock3 className="mt-0.5 size-3.5 shrink-0" />
              Lịch sát ca trong vòng 60 phút chỉ hiển thị cảnh báo và vẫn có thể
              chọn. Tasker trùng lịch sẽ không thể chọn.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
