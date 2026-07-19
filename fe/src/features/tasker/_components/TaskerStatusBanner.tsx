"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Clock,
  FileText,
  Info,
  ListChecks,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildReviewParts,
  getReviewGeneralNote,
} from "@/lib/kyc/review-notes";
import { TaskerStatus } from "@/features/tasker/types/tasker.type";

/**
 * Banner trạng thái xét duyệt hồ sơ tasker (chưa nộp / chờ duyệt / cần bổ sung /
 * bị từ chối). Hiển thị ở trang Hồ sơ, không hiển thị ở trang chủ tasker.
 */
export function TaskerStatusBanner({
  status,
  adminNotes,
}: {
  status: TaskerStatus | undefined;
  adminNotes?: string;
}) {
  if (!status) {
    return (
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex w-full flex-col items-start gap-4 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 sm:flex-row sm:items-center">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
            <FileText className="size-5 text-orange-600" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-orange-700">
              Bạn chưa có hồ sơ Đối tác
            </p>
            <p className="mt-0.5 text-xs text-orange-600/70">
              Hoàn thiện hồ sơ để bắt đầu nhận đơn và kiếm thu nhập.
            </p>
          </div>
          <Button
            asChild
            size="sm"
            className="shrink-0 gap-2 rounded-xl bg-orange-500 hover:bg-orange-600"
          >
            <Link href="/tasker/onboarding">
              Nộp hồ sơ ngay
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </motion.div>
    );
  }

  if (status === TaskerStatus.APPROVED) return null;

  if (status === TaskerStatus.PENDING) {
    return (
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex w-full flex-col items-start gap-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5 sm:flex-row sm:items-center">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-yellow-500/15">
            <Clock className="size-5 text-yellow-600" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-yellow-700">
              Hồ sơ đang chờ xét duyệt
            </p>
            <p className="mt-0.5 text-xs text-yellow-600/70">
              Admin sẽ phản hồi trong vòng 24 giờ làm việc. Bạn chưa thể nhận đơn trong thời gian này.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-yellow-500/10 px-3 py-1.5">
            <span className="size-2 animate-pulse rounded-full bg-yellow-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-600">
              Đang xử lý
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (status === TaskerStatus.NEED_INFO) {
    const parts = buildReviewParts(adminNotes);
    const generalNote = getReviewGeneralNote(adminNotes);

    return (
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex w-full flex-col items-start gap-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 sm:flex-row">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15">
            <Info className="size-5 text-blue-600" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-semibold text-blue-700">
              Cần bổ sung hồ sơ
            </p>
            {parts.length > 0 ? (
              <ul className="space-y-1">
                {parts.map((part) => (
                  <li
                    key={part.id}
                    className="flex items-start gap-1.5 text-xs text-blue-700/90"
                  >
                    <ListChecks className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                    <span>
                      <span className="font-semibold">{part.label}</span>
                      {part.note && (
                        <span className="text-blue-600/70"> — {part.note}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : generalNote || adminNotes ? (
              <p className="text-xs italic text-blue-600/80">
                {generalNote || adminNotes}
              </p>
            ) : null}
          </div>
          <Button
            asChild
            size="sm"
            className="shrink-0 gap-2 rounded-xl bg-blue-600 hover:bg-blue-700"
          >
            <Link href="/tasker/onboarding">
              Bổ sung ngay
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </motion.div>
    );
  }

  if (status === TaskerStatus.REJECTED) {
    const parts = buildReviewParts(adminNotes);
    const generalNote = getReviewGeneralNote(adminNotes);
    const reason = generalNote || (parts.length === 0 ? adminNotes : "");

    return (
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex w-full items-start gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15">
            <XCircle className="size-5 text-red-600" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-sm font-semibold text-red-700">
              Hồ sơ không được duyệt
            </p>
            {reason && (
              <p className="text-xs italic text-red-600/70">Lý do: {reason}</p>
            )}
            {parts.length > 0 && (
              <ul className="space-y-1">
                {parts.map((part) => (
                  <li
                    key={part.id}
                    className="flex items-start gap-1.5 text-xs text-red-700/90"
                  >
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-red-500" />
                    <span>
                      <span className="font-semibold">{part.label}</span>
                      {part.note && (
                        <span className="text-red-600/70"> — {part.note}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-red-600/60">
              Liên hệ hotline <span className="font-bold">1800 6868</span> để được hỗ trợ.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}
