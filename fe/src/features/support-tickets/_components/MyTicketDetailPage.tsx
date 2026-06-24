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
} from "lucide-react";
import {
  useMyTicketDetail,
  useSubmitSurvey,
} from "@/features/support-tickets/hooks/useMyTicket";
import { myTicketApi } from "@/features/support-tickets/services/my-ticket.service";
import { useAuth } from "@/features/auth/hooks/auth.hooks";
import type { SubmitSurveyDto } from "@/features/support-tickets/types/my-ticket.types";
import {
  STATUS_LABEL,
  STATUS_TONE,
  TONE_BADGE_CLASS,
  CATEGORY_LABEL,
  PRIORITY_LABEL,
} from "@/features/support-tickets/shared/ticket.labels";
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
function CSATSurvey({ ticketId }: { ticketId: string }) {
  const submit = useSubmitSurvey(ticketId);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
        <p className="text-sm font-bold text-emerald-700">
          Cảm ơn bạn đã đánh giá!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-foreground">
        <Star className="h-4 w-4 text-amber-400" /> Bạn hài lòng với hỗ trợ này
        không?
      </p>
      <div className="mb-3 flex gap-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setRating(s)}
            className={`flex-1 rounded-xl py-2 text-lg transition-all ${
              rating >= s ? "scale-105 bg-amber-400" : "bg-muted"
            }`}
          >
            ⭐
          </button>
        ))}
      </div>
      <textarea
        rows={2}
        placeholder="Nhận xét thêm (tuỳ chọn)..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="mb-3 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
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
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-md shadow-primary/25 disabled:opacity-50"
      >
        {submit.isPending ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          "Gửi đánh giá"
        )}
      </button>
    </div>
  );
}

// ─── Main Detail Page ─────────────────────────────────────────────────────────
export const MyTicketDetailPage: React.FC<{ ticketId: string }> = ({
  ticketId,
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: ticket, isLoading } = useMyTicketDetail(ticketId);
  const { data: me } = useAuth();
  const [activeTab, setActiveTab] = useState<"messages" | "info">("messages");

  // Adapter ChatBox → myTicketApi (Customer/Tasker dùng luồng của chính họ).
  const chatApi = useMemo<ChatApi>(
    () => ({
      sendMessage: (dto) => myTicketApi.sendMessage(ticketId, dto),
      uploadImage: (file) => myTicketApi.uploadAttachment(ticketId, file),
      markRead: async (dto) => {
        const res = await myTicketApi.markRead(ticketId, dto);
        // Đọc xong → cập nhật badge list + tổng chưa đọc.
        queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
        return res;
      },
    }),
    [ticketId, queryClient],
  );

  const messagingLocked = ticket ? isMessagingLocked(ticket.status) : false;
  const surveyOpen = ticket ? canSubmitSurvey(ticket.status) : false;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="bg-card px-4 pb-4 pt-12 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 animate-pulse rounded-xl bg-muted" />
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
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <p className="text-muted-foreground">Không tìm thấy ticket</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-sm font-semibold text-primary"
        >
          ← Quay lại
        </button>
      </div>
    );
  }

  const threadHeader = (
    <div className="space-y-3 px-4 pt-4">
      {ticket.description && (
        <div className="rounded-2xl border border-border/30 bg-muted/50 p-4">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Mô tả ban đầu
          </p>
          <p className="text-sm text-foreground/80">{ticket.description}</p>
        </div>
      )}
      {surveyOpen && <CSATSurvey ticketId={ticketId} />}
    </div>
  );

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <div className="z-20 bg-card px-4 pb-4 pt-12 shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-primary">
              {ticket.ticketCode ?? "TICKET"}
            </p>
            <h1 className="line-clamp-1 text-sm font-bold text-foreground">
              {ticket.subject}
            </h1>
          </div>
          <span
            className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold ${TONE_BADGE_CLASS[STATUS_TONE[ticket.status]]}`}
          >
            {STATUS_LABEL[ticket.status]}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-muted p-1">
          <button
            onClick={() => setActiveTab("messages")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
              activeTab === "messages"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" /> Hội thoại
          </button>
          <button
            onClick={() => setActiveTab("info")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
              activeTab === "info"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <FileText className="h-3.5 w-3.5" /> Thông tin
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "messages" ? (
        <TicketChatBox
          ticketId={ticketId}
          currentUserId={me?.id ?? null}
          initialMessages={ticket.messages}
          api={chatApi}
          locked={messagingLocked}
          threadHeader={threadHeader}
          threadClassName="pb-2"
          composerClassName="border-t border-border/40 bg-card p-4 pb-8"
        />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key="info"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {[
              { label: "Mã ticket", value: ticket.ticketCode ?? "—" },
              { label: "Loại", value: CATEGORY_LABEL[ticket.category] },
              { label: "Độ ưu tiên", value: PRIORITY_LABEL[ticket.priority] },
              { label: "Nguồn", value: ticket.source },
              {
                label: "SLA",
                value: ticket.slaBreached ? "⚠️ Vi phạm SLA" : "✅ Trong hạn",
              },
              { label: "Ngày tạo", value: fmtDate(ticket.createdAt) },
              { label: "Cập nhật", value: fmtDate(ticket.updatedAt) },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between border-b border-border/30 py-3"
              >
                <span className="text-sm text-muted-foreground">
                  {item.label}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {item.value}
                </span>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};
