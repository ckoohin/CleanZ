"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Clock3, Loader2, PhoneOff } from "lucide-react";
import {
  useAbsenceEligibility,
  useReportCustomerAbsence,
} from "@/features/booking/hooks/useTaskerBooking";
import type { ReportBookingAbsencePayload } from "@/features/booking/types/absence-report.types";
import { TaskerCustomerAbsenceSheet } from "./TaskerCustomerAbsenceSheet";

function countdown(target: string | null, now: number) {
  if (!target) return null;
  const seconds = Math.max(
    0,
    Math.ceil((new Date(target).getTime() - now) / 1000),
  );
  if (seconds === 0) return null;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0
    ? `${minutes} phút ${rest.toString().padStart(2, "0")} giây`
    : `${rest} giây`;
}

export function TaskerAbsenceReportAction({
  bookingId,
}: {
  bookingId: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState(false);
  const submitLockRef = useRef(false);
  const eligibility = useAbsenceEligibility(bookingId, true);
  const report = useReportCustomerAbsence(bookingId);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const data = eligibility.data;
  const remaining = countdown(data?.availableAt ?? null, now);
  const expired = Boolean(
    data?.expiresAt && new Date(data.expiresAt).getTime() < now,
  );
  const locallyAvailable = Boolean(data?.availableAt && !remaining && !expired);
  const canOpen =
    !expired &&
    Boolean(
      data?.canReport ||
      (locallyAvailable && data?.reasonCode === "ABSENCE_REPORT_WAIT_REQUIRED"),
    );

  const submit = (payload: ReportBookingAbsencePayload) => {
    if (submitLockRef.current || report.isPending) return;
    submitLockRef.current = true;
    report.mutate(payload, {
      onSuccess: () => setOpen(false),
      onSettled: () => {
        submitLockRef.current = false;
      },
    });
  };

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm">
          <PhoneOff className="size-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-sm font-black text-amber-950">
            Không thấy hoặc không liên hệ được khách?
          </h3>
          <p className="text-xs leading-5 text-amber-800">
            Hãy gọi khách và chờ đủ thời gian tại địa chỉ trước khi gửi ảnh báo
            cáo.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!canOpen || eligibility.isLoading || report.isPending}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-amber-400 bg-white px-4 py-3.5 text-sm font-black text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-amber-200 disabled:bg-white/60 disabled:text-amber-500"
      >
        {eligibility.isLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : remaining ? (
          <Clock3 className="size-4" />
        ) : (
          <PhoneOff className="size-4" />
        )}
        {eligibility.isLoading
          ? "Đang kiểm tra điều kiện…"
          : remaining
            ? `Có thể báo sau ${remaining}`
            : canOpen
              ? "Không liên hệ được khách"
              : (data?.reason ?? "Chưa thể gửi báo cáo")}
      </button>
      <AnimatePresence>
        {open && data && (
          <TaskerCustomerAbsenceSheet
            estimatedCompensation={data.estimatedCompensation}
            reviewSlaHours={data.reviewSlaHours}
            isSubmitting={report.isPending}
            onClose={() => setOpen(false)}
            onSubmit={submit}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
