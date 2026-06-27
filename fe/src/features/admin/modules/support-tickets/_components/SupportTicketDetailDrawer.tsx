"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge as Pill, type BadgeTone } from "@/components/admin";
import {
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  ArrowRight,
  History,
  FileText,
} from "lucide-react";
import { useTicketDetail } from "../hooks/useSupportTicket";
import {
  STATUS_LABEL,
  STATUS_TONE,
  CATEGORY_LABEL,
  PRIORITY_LABEL,
  PENDING_REASON_LABEL,
  type Tone,
} from "@/features/support-tickets/shared/ticket.labels";
import { StatusChangePanel } from "./panels/StatusChangePanel";
import { AssignPanel } from "./panels/AssignPanel";
import { ReclassifyPanel } from "./panels/ReclassifyPanel";
import { ResolutionPanel } from "./panels/ResolutionPanel";
import { AdminTicketChat } from "./panels/AdminTicketChat";

function fmtDate(d: string | null | undefined) {
  return d ? new Date(d).toLocaleString("vi-VN") : "N/A";
}

/** Map the shared ticket Tone → cz semantic StatusBadge tone. */
const TONE_TO_CZ: Record<Tone, BadgeTone> = {
  neutral: "neutral",
  info: "info",
  warning: "warning",
  success: "success",
  muted: "neutral",
};

interface Props {
  ticketId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const SupportTicketDetailDrawer: React.FC<Props> = ({ ticketId, isOpen, onClose }) => {
  const { data: ticket, isLoading } = useTicketDetail(ticketId);

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="cz-admin w-full sm:max-w-2xl p-0 flex flex-col bg-[var(--c-card)]">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-[var(--c-line)]">
          <SheetTitle className="flex items-center gap-2 text-base font-bold text-[var(--c-ink)]">
            <FileText className="w-4 h-4 text-[var(--c-primary-strong)]" />
            {isLoading ? <Skeleton className="h-5 w-32" /> : ticket?.ticketCode ?? "Chi tiết ticket"}
          </SheetTitle>
          <SheetDescription asChild>
            <span className="text-xs text-[var(--c-muted)] line-clamp-1">
              {isLoading ? <Skeleton className="h-3 w-48 mt-1" /> : ticket?.subject}
            </span>
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : ticket ? (
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6 space-y-5">
              {/* ── Info grid ── */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoItem label="Trạng thái">
                  <Pill tone={TONE_TO_CZ[STATUS_TONE[ticket.status]]}>
                    {STATUS_LABEL[ticket.status]}
                  </Pill>
                </InfoItem>
                <InfoItem label="Độ ưu tiên">
                  <span className="font-semibold">{PRIORITY_LABEL[ticket.priority]}</span>
                </InfoItem>
                <InfoItem label="Loại">
                  <span>{CATEGORY_LABEL[ticket.category]}</span>
                </InfoItem>
                <InfoItem label="Nguồn">
                  <span>{ticket.source}</span>
                </InfoItem>
                <InfoItem label="SLA">
                  {ticket.slaBreached ? (
                    <span className="text-[#E11D48] font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Vi phạm
                    </span>
                  ) : (
                    <span className="text-[#0E9F6E] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Trong hạn
                    </span>
                  )}
                </InfoItem>
                <InfoItem label="Ngày tạo">
                  <span className="text-xs">{fmtDate(ticket.createdAt)}</span>
                </InfoItem>
                <InfoItem label="Người báo cáo">
                  <span className="text-xs">{ticket.reporter?.fullName ?? "—"}</span>
                </InfoItem>
                <InfoItem label="Đối tượng liên quan">
                  <span className="text-xs">{ticket.counterparty?.fullName ?? "—"}</span>
                </InfoItem>
                <InfoItem label="Admin phụ trách">
                  <span className="text-xs">{ticket.assignedAdmin?.fullName ?? "Chưa gán"}</span>
                </InfoItem>
                {ticket.bookingCode && (
                  <InfoItem label="Mã booking">
                    <span className="text-xs font-medium">{ticket.bookingCode}</span>
                  </InfoItem>
                )}
                <InfoItem label="Hạn phản hồi (SLA)">
                  <span className="text-xs">{fmtDate(ticket.firstResponseDueAt)}</span>
                </InfoItem>
                <InfoItem label="Hạn xử lý (SLA)">
                  <span className="text-xs">{fmtDate(ticket.resolutionDueAt)}</span>
                </InfoItem>
                {ticket.status === "PENDING" && ticket.pendingReason && (
                  <InfoItem label="Lý do tạm chờ">
                    <span className="text-xs">{PENDING_REASON_LABEL[ticket.pendingReason]}</span>
                  </InfoItem>
                )}
              </div>

              {ticket.description && (
                <div className="rounded-xl bg-[var(--c-card-2)] border border-[var(--c-line)] p-3 text-sm text-[var(--c-ink-soft)]">
                  <p className="text-xs font-bold text-[var(--c-muted)] mb-1.5">Mô tả</p>
                  {ticket.description}
                </div>
              )}

              {ticket.attachments?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-[var(--c-muted)] uppercase tracking-wide">
                    Ảnh đính kèm ({ticket.attachments.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ticket.attachments.map((a) => (
                      <a key={a.id} href={a.url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={a.url} alt="bằng chứng" className="size-16 rounded-lg border border-[var(--c-line)] object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Tabs ── */}
              <Tabs defaultValue="messages">
                <TabsList className="w-full rounded-xl bg-[var(--c-card-2)]">
                  <TabsTrigger value="messages" className="flex-1 text-xs">
                    <MessageSquare className="w-3.5 h-3.5 mr-1" />
                    Tin nhắn ({ticket.messages.filter((m) => m.audience !== "INTERNAL").length})
                  </TabsTrigger>
                  <TabsTrigger value="actions" className="flex-1 text-xs">
                    <ArrowRight className="w-3.5 h-3.5 mr-1" />
                    Hành động
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex-1 text-xs">
                    <History className="w-3.5 h-3.5 mr-1" />
                    Lịch sử ({ticket.statusLogs.length})
                  </TabsTrigger>
                </TabsList>

                {/* Messages — 3 luồng tách (admin trung gian) */}
                <TabsContent value="messages" className="mt-4">
                  <AdminTicketChat ticket={ticket} />
                </TabsContent>

                {/* Actions */}
                <TabsContent value="actions" className="space-y-5 mt-4">
                  <StatusChangePanel ticket={ticket} />
                  {ticket.status === "CLOSED" ? (
                    <p className="rounded-lg bg-[var(--c-card-2)] border border-[var(--c-line)] p-3 text-xs text-[var(--c-muted)]">
                      Ticket đã đóng — không thể gán, phân loại lại hay ghi nhận kết luận.
                    </p>
                  ) : (
                    <>
                      <ReclassifyPanel ticket={ticket} />
                      <AssignPanel ticket={ticket} />
                      <ResolutionPanel ticket={ticket} />
                    </>
                  )}
                </TabsContent>

                {/* History */}
                <TabsContent value="history" className="space-y-2 mt-4">
                  {ticket.statusLogs.length === 0 ? (
                    <p className="text-xs text-[var(--c-muted)] text-center py-4">Chưa có lịch sử</p>
                  ) : (
                    ticket.statusLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2.5 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--c-primary)] mt-1.5 shrink-0" />
                        <div>
                          <p className="text-[var(--c-ink-soft)]">
                            {log.oldStatus ? (
                              <>
                                <span className="font-medium">{STATUS_LABEL[log.oldStatus]}</span>
                                {" → "}
                                <span className="font-bold text-[var(--c-primary-strong)]">{STATUS_LABEL[log.newStatus]}</span>
                              </>
                            ) : (
                              <span className="font-bold text-[var(--c-primary-strong)]">Tạo: {STATUS_LABEL[log.newStatus]}</span>
                            )}
                          </p>
                          {log.note && <p className="text-[var(--c-muted)] italic">&quot;{log.note}&quot;</p>}
                          <p className="text-[var(--c-muted)]/60">{fmtDate(log.createdAt)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        ) : (
          <div className="p-6 text-center text-[var(--c-muted)] text-sm">Không tìm thấy ticket</div>
        )}
      </SheetContent>
    </Sheet>
  );
};

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--c-muted)]">{label}</p>
      <div className="text-sm text-[var(--c-ink-soft)]">{children}</div>
    </div>
  );
}
