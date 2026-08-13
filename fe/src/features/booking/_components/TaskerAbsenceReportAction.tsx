"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ChevronDown, Clock3, Loader2, PhoneOff } from "lucide-react";
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
  const [detailsOpen, setDetailsOpen] = useState(false);
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
  const detailsId = `tasker-absence-details-${bookingId}`;

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
    <section className="border-t border-border/50 pt-2">
      <button
        type="button"
        onClick={() => setDetailsOpen((current) => !current)}
        aria-expanded={detailsOpen}
        aria-controls={detailsId}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-1 py-2 text-left text-xs font-semibold text-muted-foreground transition-colors hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
      >
        <span className="flex min-w-0 items-center gap-2">
          <PhoneOff className="size-4 shrink-0 text-amber-600" />
          <span>Khách không có mặt?</span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 transition-transform ${
            detailsOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {detailsOpen && (
        <div
          id={detailsId}
          className="mt-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3"
        >
          <p className="text-xs leading-5 text-amber-900">
            Hãy gọi khách và chờ đủ thời gian tại địa chỉ trước khi gửi ảnh báo
            cáo.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={!canOpen || eligibility.isLoading || report.isPending}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-xs font-bold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-amber-200 disabled:bg-white/60 disabled:text-amber-500"
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
                  ? "Báo khách vắng mặt"
                  : (data?.reason ?? "Chưa thể gửi báo cáo")}
          </button>
        </div>
      )}

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
