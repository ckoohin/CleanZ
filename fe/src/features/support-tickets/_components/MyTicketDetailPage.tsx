"use client";

import React, { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Star,
  MessageSquare,
  FileText,
  AlertCircle,
  Clock,
  RotateCcw,
  CalendarPlus,
  CalendarClock,
  Hash,
  Flag,
  Radio,
  ShieldCheck,
  ShieldAlert,
  Timer,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useMyTicketDetail,
  useReopenTicket,
  useSubmitSurvey,
} from "@/features/support-tickets/hooks/useMyTicket";
import { myTicketApi } from "@/features/support-tickets/services/my-ticket.service";
import { useAuth } from "@/features/auth/hooks/auth.hooks";
import type { SubmitSurveyDto } from "@/features/support-tickets/types/my-ticket.types";
import {
  STATUS_LABEL,
  STATUS_TONE,
  TONE_BADGE_CLASS,
  categoryLabelFor,
  pendingHintFor,
  PRIORITY_LABEL,
  RESOLUTION_LABEL,
  SOURCE_LABEL,
} from "@/features/support-tickets/shared/ticket.labels";
import { CATEGORY_ICON } from "@/features/support-tickets/shared/ticket.category-meta";
import {
  isMessagingLocked,
  canSubmitSurvey,
} from "@/features/support-tickets/shared/ticket.machine";
import { TicketChatBox } from "./chat/TicketChatBox";
import type { ChatApi } from "./chat/useTicketChat";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── CSAT Survey ─────────────────────────────────────────────────────────────
/** Nhãn theo mức sao — nói rõ 3 sao nghĩa là gì thay vì để người dùng tự đoán. */
const RATING_LABEL = ["", "Rất tệ", "Chưa tốt", "Bình thường", "Hài lòng", "Tuyệt vời"];

function CSATSurvey({ ticketId }: { ticketId: string }) {
  const submit = useSubmitSurvey(ticketId);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-center">
        <CheckCircle2 className="mx-auto mb-2 size-8 text-emerald-500" />
        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
          Cảm ơn bạn đã đánh giá!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
      <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-foreground">
        <Star className="size-4 fill-amber-400 text-amber-400" />
        Bạn hài lòng với hỗ trợ này không?
      </p>
      <p className="mb-3 text-xs text-muted-foreground">
        Đánh giá của bạn giúp chúng tôi cải thiện chất lượng hỗ trợ.
      </p>

      <div className="mb-1 flex gap-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            aria-label={`${s} sao — ${RATING_LABEL[s]}`}
            aria-pressed={rating === s}
            onClick={() => setRating(s)}
            className={cn(
              "flex flex-1 items-center justify-center rounded-xl border py-2.5 transition-all active:scale-95",
              rating >= s
                ? "border-amber-400 bg-amber-400/15"
                : "border-border bg-muted hover:border-amber-400/50",
            )}
          >
            <Star
              className={cn(
                "size-5 transition-colors",
                rating >= s
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground",
              )}
            />
          </button>
        ))}
      </div>
      <p
        className={cn(
          "mb-3 h-4 text-center text-xs font-semibold transition-colors",
          rating ? "text-amber-600 dark:text-amber-400" : "text-transparent",
        )}
      >
        {RATING_LABEL[rating] || "—"}
      </p>

      <textarea
        rows={2}
        placeholder="Nhận xét thêm (tuỳ chọn)..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="mb-3 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <button
        onClick={() => {
          if (!rating) return;
          submit.mutate(
            { rating, comment: comment || undefined } as SubmitSurveyDto,
            { onSuccess: () => setSubmitted(true) },
          );
        }}
        disabled={!rating || submit.isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-md shadow-primary/25 transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
      >
        {submit.isPending ? (
          <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          "Gửi đánh giá"
        )}
      </button>
    </div>
  );
}

// ─── Mở lại ticket đã đóng ────────────────────────────────────────────────────
/**
 * Trước đây `CLOSED` là ngõ cụt: sau auto-close, khách không chat được, không
 * mở lại được, chỉ còn cách tạo ticket mới và mất toàn bộ ngữ cảnh. Điều kiện
 * hiển thị (vai + hạn mở lại) do BE quyết định qua `canReopen`.
 */
function ReopenBox({
  ticketId,
  deadline,
}: {
  ticketId: string;
  deadline?: string | null;
}) {
  const reopen = useReopenTicket(ticketId);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();
  const tooShort = trimmed.length < 10;

  if (!open) {
    return (
      <div className="border-t border-border/40 bg-card p-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary/5 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/10"
        >
          <RotateCcw className="size-4" /> Mở lại yêu cầu
        </button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {deadline
            ? `Yêu cầu đã đóng — bạn còn thể mở lại đến ${new Date(deadline).toLocaleDateString("vi-VN")}.`
            : "Yêu cầu đã đóng — bạn có thể mở lại nếu vấn đề chưa được giải quyết."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 border-t border-border/40 bg-card p-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <textarea
        rows={3}
        autoFocus
        placeholder="Vì sao bạn cần mở lại yêu cầu này? (ít nhất 10 ký tự)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {tooShort && trimmed.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Còn {10 - trimmed.length} ký tự nữa.
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setOpen(false);
            setReason("");
          }}
          className="flex-1 rounded-xl border border-border py-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted"
        >
          Huỷ
        </button>
        <button
          onClick={() => reopen.mutate(trimmed)}
          disabled={tooShort || reopen.isPending}
          className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white transition-all hover:brightness-105 disabled:opacity-50"
        >
          {reopen.isPending ? "Đang gửi..." : "Gửi yêu cầu mở lại"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Detail Page ─────────────────────────────────────────────────────────
export const MyTicketDetailPage: React.FC<{ ticketId: string }> = ({
  ticketId,
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    data: ticket,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useMyTicketDetail(ticketId);
  const { data: me } = useAuth();
  const viewerRole = me?.role === "TASKER" ? "TASKER" : "CUSTOMER";
  const [activeTab, setActiveTab] = useState<"messages" | "info">("messages");

  // Adapter ChatBox → myTicketApi (Customer/Tasker dùng luồng của chính họ).
  const chatApi = useMemo<ChatApi>(
    () => ({
      sendMessage: (dto) => myTicketApi.sendMessage(ticketId, dto),
      uploadImage: (file) => myTicketApi.uploadAttachment(ticketId, file),
      markRead: async (dto) => {
        const res = await myTicketApi.markRead(ticketId, dto);
        // Chỉ làm mới danh sách + tổng chưa đọc; KHÔNG invalidate `detail` của
        // chính ticket đang mở (sẽ refetch → sinh lượt markRead kế tiếp).
        queryClient.invalidateQueries({
          queryKey: ["my-tickets", "list-infinite"],
        });
        queryClient.invalidateQueries({
          queryKey: ["my-tickets", "unread-total"],
        });
        return res;
      },
      loadOlder: (beforeId) => myTicketApi.olderMessages(ticketId, beforeId),
    }),
    [ticketId, queryClient],
  );

  const messagingLocked = ticket ? isMessagingLocked(ticket.status) : false;
  const surveyOpen = ticket
    ? canSubmitSurvey(ticket.status, ticket.myRole)
    : false;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="bg-card px-4 pb-4 pt-[max(3rem,env(safe-area-inset-top))] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="size-9 animate-pulse rounded-xl bg-muted" />
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="space-y-3 px-4 py-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl border border-border/50 bg-card"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!ticket) {
    // Phân biệt "không tồn tại / không có quyền" với "gọi API hỏng": trước đây
    // cả hai đều hiện "Không tìm thấy ticket", nên lỗi mạng bị hiểu nhầm là
    // ticket đã biến mất và người dùng không biết có thể thử lại.
    const status = (error as { response?: { status?: number } } | null)?.response
      ?.status;
    const notFound = status === 404 || status === 403;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
          <AlertCircle className="size-7 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          {notFound
            ? "Không tìm thấy yêu cầu này, hoặc bạn không có quyền xem."
            : "Không tải được yêu cầu. Vui lòng kiểm tra kết nối và thử lại."}
        </p>
        <div className="flex gap-2">
          {!notFound && (
            <button
              onClick={() => void refetch()}
              disabled={isFetching}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition-all hover:brightness-105 disabled:opacity-50"
            >
              {isFetching ? "Đang tải…" : "Thử lại"}
            </button>
          )}
          <button
            onClick={() => router.back()}
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  const pendingHint =
    ticket.status === "PENDING"
      ? pendingHintFor(ticket.pendingReason, ticket.awaitingMe)
      : null;
  const CategoryIcon = CATEGORY_ICON[ticket.category];

  const threadHeader = (
    <div className="space-y-3 px-4 pt-4">
      {/* Bóng đang ở sân ai — đặt ngay đầu luồng chat để thấy trước khi gõ. */}
      {pendingHint && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-2xl border p-3 text-sm font-semibold",
            pendingHint.urgent
              ? "border-amber-500/30 bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/15 dark:text-amber-400"
              : "border-border/30 bg-muted/50 text-muted-foreground",
          )}
        >
          {pendingHint.urgent ? (
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
          ) : (
            <Clock className="mt-0.5 size-4 shrink-0" />
          )}
          <span>
            {pendingHint.text}
            {pendingHint.urgent && (
              <span className="mt-0.5 block text-xs font-normal">
                Gửi tin nhắn bên dưới để tiếp tục xử lý yêu cầu.
              </span>
            )}
          </span>
        </div>
      )}
      {/* Kết luận xử lý — thứ khách quan tâm nhất, trước đây không hiển thị ở đâu */}
      {!!ticket.resolutions?.length && (
        <div className="overflow-hidden rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07]">
          <p className="flex items-center gap-1.5 border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" /> Kết luận xử lý
          </p>
          <div className="divide-y divide-emerald-500/15">
            {ticket.resolutions.map((r) => (
              <div key={r.id} className="px-4 py-2.5">
                <p className="flex items-baseline justify-between gap-2 text-sm font-semibold text-foreground">
                  <span>{RESOLUTION_LABEL[r.type] ?? r.type}</span>
                  {r.amount && (
                    <span className="shrink-0 tabular-nums text-emerald-700 dark:text-emerald-400">
                      {Number(r.amount).toLocaleString("vi-VN")}đ
                    </span>
                  )}
                </p>
                {r.note && (
                  <p className="mt-0.5 text-xs text-foreground/70">{r.note}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {ticket.description && (
        <div className="rounded-2xl border border-border/30 bg-muted/50 p-4">
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            <FileText className="size-3.5" /> Mô tả ban đầu
          </p>
          <p className="whitespace-pre-wrap text-sm text-foreground/80">
            {ticket.description}
          </p>
        </div>
      )}
    </div>
  );

  // Bảng thông tin — mỗi dòng có icon để quét nhanh, dòng nào cần chú ý thì
  // tô màu (SLA vi phạm, đang chờ chính người dùng).
  const infoRows: {
    label: string;
    value: string;
    icon: LucideIcon;
    tone?: "warning" | "success";
  }[] = [
    { label: "Mã ticket", value: ticket.ticketCode ?? "—", icon: Hash },
    {
      label: "Vai của bạn",
      value:
        ticket.myRole === "COUNTERPARTY"
          ? "Bên được yêu cầu phản hồi"
          : "Người gửi yêu cầu",
      icon: UserCog,
    },
    {
      label: "Loại",
      value: categoryLabelFor(ticket.category, viewerRole),
      icon: CategoryIcon,
    },
    ...(pendingHint
      ? [
          {
            label: "Đang chờ",
            value: pendingHint.text,
            icon: Clock,
            ...(pendingHint.urgent ? { tone: "warning" as const } : {}),
          },
        ]
      : []),
    { label: "Độ ưu tiên", value: PRIORITY_LABEL[ticket.priority], icon: Flag },
    {
      label: "Nguồn",
      value: SOURCE_LABEL[ticket.source] ?? ticket.source,
      icon: Radio,
    },
    {
      label: "SLA",
      value: ticket.slaBreached ? "Vi phạm SLA" : "Trong hạn",
      icon: ticket.slaBreached ? ShieldAlert : ShieldCheck,
      tone: ticket.slaBreached ? ("warning" as const) : ("success" as const),
    },
    ...(ticket.resolutionDueAt
      ? [
          {
            label: "Hạn xử lý",
            value: fmtDate(ticket.resolutionDueAt),
            icon: Timer,
          },
        ]
      : []),
    { label: "Ngày tạo", value: fmtDate(ticket.createdAt), icon: CalendarPlus },
    {
      label: "Cập nhật",
      value: fmtDate(ticket.updatedAt),
      icon: CalendarClock,
    },
  ];

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <div className="z-20 border-b border-border/40 bg-card px-4 pb-3 pt-[max(3rem,env(safe-area-inset-top))] shadow-sm">
        <div className="mb-3 flex items-start gap-3">
          <button
            onClick={() => router.back()}
            aria-label="Quay lại"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted transition-colors hover:bg-muted/70"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-primary">
                {ticket.ticketCode ?? "TICKET"}
              </span>
              {ticket.myRole === "COUNTERPARTY" && (
                <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                  Về bạn
                </span>
              )}
              {ticket.slaBreached && (
                <span className="rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                  SLA
                </span>
              )}
            </div>
            <h1 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-foreground">
              {ticket.subject}
            </h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CategoryIcon className="size-3 shrink-0" />
              <span className="truncate">
                {categoryLabelFor(ticket.category, viewerRole)}
              </span>
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-lg border px-2 py-1 text-xs font-bold",
              TONE_BADGE_CLASS[STATUS_TONE[ticket.status]],
            )}
          >
            {STATUS_LABEL[ticket.status]}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-muted p-1" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === "messages"}
            onClick={() => setActiveTab("messages")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all",
              activeTab === "messages"
                ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <MessageSquare className="size-3.5" /> Hội thoại
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "info"}
            onClick={() => setActiveTab("info")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all",
              activeTab === "info"
                ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <FileText className="size-3.5" /> Thông tin
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "messages" ? (
        <TicketChatBox
          ticketId={ticketId}
          currentUserId={me?.id ?? null}
          currentUserRole={me?.role === "TASKER" ? "TASKER" : "CUSTOMER"}
          initialMessages={ticket.messages}
          api={chatApi}
          locked={messagingLocked}
          beforeComposer={
            surveyOpen ? (
              <div className="border-t border-border/40 bg-card px-4 pt-4">
                <CSATSurvey ticketId={ticketId} />
              </div>
            ) : undefined
          }
          lockedSlot={
            ticket.canReopen ? (
              <ReopenBox
                ticketId={ticketId}
                deadline={ticket.reopenDeadline}
              />
            ) : undefined
          }
          threadHeader={threadHeader}
          threadClassName="pb-2"
          composerClassName="border-t border-border/40 bg-card p-4 pb-[max(2rem,env(safe-area-inset-bottom))]"
          hideScrollbar
          hasMore={ticket.hasMoreMessages}
        />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key="info"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-y-auto px-4 py-4"
          >
            <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
              {infoRows.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 border-b border-border/30 px-4 py-3 last:border-b-0"
                >
                  <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "text-right text-sm font-semibold",
                      item.tone === "warning" &&
                        "text-amber-700 dark:text-amber-400",
                      item.tone === "success" &&
                        "text-emerald-700 dark:text-emerald-400",
                      !item.tone && "text-foreground",
                    )}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};
