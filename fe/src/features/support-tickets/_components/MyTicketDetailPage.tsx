"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Send,
  Lock,
  Star,
  Paperclip,
  MessageSquare,
  FileText,
} from "lucide-react";
import {
  useMyTicketDetail,
  useSendMyTicketMessage,
  useSubmitSurvey,
  useUploadTicketAttachment,
} from "@/features/support-tickets/hooks/useMyTicket";
import type { SubmitSurveyDto } from "@/features/support-tickets/types/my-ticket.types";
import {
  STATUS_LABEL,
  STATUS_TONE,
  TONE_BADGE_CLASS,
  CATEGORY_LABEL,
  PRIORITY_LABEL,
} from "@/features/support-tickets/shared/ticket.labels";
import { isMessagingLocked, canSubmitSurvey } from "@/features/support-tickets/shared/ticket.machine";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// ─── CSAT Survey ─────────────────────────────────────────────────────────────
function CSATSurvey({ ticketId }: { ticketId: string }) {
  const submit = useSubmitSurvey(ticketId);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
        <p className="font-bold text-emerald-700 text-sm">Cảm ơn bạn đã đánh giá!</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4">
      <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
        <Star className="w-4 h-4 text-amber-400" /> Bạn hài lòng với hỗ trợ này không?
      </p>
      <div className="flex gap-2 mb-3">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setRating(s)}
            className={`flex-1 py-2 rounded-xl text-lg transition-all ${
              rating >= s ? "bg-amber-400 scale-105" : "bg-muted"
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
        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 mb-3"
      />
      <button
        onClick={() => {
          if (!rating) return;
          submit.mutate({ rating, comment: comment || undefined } as SubmitSurveyDto, {
            onSuccess: () => setSubmitted(true),
          });
        }}
        disabled={!rating || submit.isPending}
        className="w-full py-3 bg-primary text-white font-bold text-sm rounded-xl shadow-md shadow-primary/25 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submit.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Gửi đánh giá"}
      </button>
    </div>
  );
}

// ─── Main Detail Page ─────────────────────────────────────────────────────────
export const MyTicketDetailPage: React.FC<{ ticketId: string }> = ({ ticketId }) => {
  const router = useRouter();
  const { data: ticket, isLoading } = useMyTicketDetail(ticketId);
  const sendMessage = useSendMyTicketMessage(ticketId);
  const uploadAttachment = useUploadTicketAttachment(ticketId);

  const [msgText, setMsgText] = useState("");
  const [activeTab, setActiveTab] = useState<"messages" | "info">("messages");

  const handleSend = () => {
    if (!msgText.trim()) return;
    sendMessage.mutate({ body: msgText.trim() }, {
      onSuccess: () => setMsgText(""),
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAttachment.mutate(file);
    e.target.value = "";
  };

  // Gate nghiệp vụ (mirror BE): chỉ khóa gửi tin khi CLOSED (spec §1.4 → 409);
  // CSAT mở khi RESOLVED/CLOSED (spec §1.6).
  const messagingLocked = ticket ? isMessagingLocked(ticket.status) : false;
  const surveyOpen = ticket ? canSubmitSurvey(ticket.status) : false;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="bg-card px-4 pt-12 pb-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-muted rounded-xl animate-pulse" />
            <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="px-4 py-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-card rounded-2xl border border-border/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <p className="text-muted-foreground">Không tìm thấy ticket</p>
        <button onClick={() => router.back()} className="mt-4 text-primary font-semibold text-sm">
          ← Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card px-4 pt-12 pb-4 shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-primary">{ticket.ticketCode ?? "TICKET"}</p>
            <h1 className="font-bold text-sm text-foreground line-clamp-1">{ticket.subject}</h1>
          </div>
          <span
            className={`text-xs font-bold flex items-center gap-1 px-2 py-1 rounded-lg border ${TONE_BADGE_CLASS[STATUS_TONE[ticket.status]]}`}
          >
            {STATUS_LABEL[ticket.status]}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex bg-muted p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("messages")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "messages" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Hội thoại
          </button>
          <button
            onClick={() => setActiveTab("info")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "info" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Thông tin
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-36">
        <AnimatePresence mode="wait">
          {activeTab === "messages" ? (
            <motion.div
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-4 space-y-3"
            >
              {/* Description */}
              {ticket.description && (
                <div className="bg-muted/50 rounded-2xl p-4 border border-border/30">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Mô tả ban đầu</p>
                  <p className="text-sm text-foreground/80">{ticket.description}</p>
                </div>
              )}

              {/* Messages */}
              {ticket.messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Chưa có tin nhắn nào</p>
                </div>
              ) : (
                ticket.messages.map((msg) => (
                  <div key={msg.id} className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <span className="text-[10px] font-bold text-primary">
                        {msg.senderUserId === ticket.id ? "T" : "A"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="bg-card border border-border/40 rounded-2xl rounded-tl-sm px-4 py-3">
                        <p className="text-sm text-foreground">{msg.body}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 ml-2">{fmtDate(msg.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}

              {/* CSAT: mở khi ticket đã RESOLVED/CLOSED */}
              {surveyOpen && (
                <div className="mt-4">
                  <CSATSurvey ticketId={ticketId} />
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="info"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-4 space-y-3"
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
                <div key={item.label} className="flex items-center justify-between py-3 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-semibold text-foreground">{item.value}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Thông báo khi ticket đã đóng — không cho gửi tin (spec §1.4) */}
      {messagingLocked && activeTab === "messages" && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border/40 p-4 pb-8 z-30">
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5" /> Ticket đã đóng — không thể gửi tin nhắn mới.
          </p>
        </div>
      )}

      {/* Input Bar — chỉ hiện khi ticket chưa đóng */}
      {!messagingLocked && activeTab === "messages" && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border/40 p-4 pb-8 z-30">
          <div className="flex items-end gap-2">
            {/* Upload button */}
            <label className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center cursor-pointer shrink-0 hover:bg-primary/10 transition-colors">
              <Paperclip className="w-4 h-4 text-muted-foreground" />
              <input type="file" accept="image/jpeg,image/png,image/jpg" className="hidden" onChange={handleFileUpload} />
            </label>

            {/* Text input */}
            <textarea
              rows={1}
              placeholder="Nhập tin nhắn..."
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              className="flex-1 bg-background border border-border rounded-2xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 max-h-24 overflow-y-auto"
            />

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!msgText.trim() || sendMessage.isPending}
              className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-primary/30 disabled:opacity-50 active:scale-95 transition-all"
            >
              {sendMessage.isPending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
