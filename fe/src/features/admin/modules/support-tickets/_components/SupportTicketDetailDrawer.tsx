"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  User,
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
  TONE_BADGE_CLASS,
} from "@/features/support-tickets/shared/ticket.labels";
import { StatusChangePanel } from "./panels/StatusChangePanel";
import { AssignPanel } from "./panels/AssignPanel";
import { ReclassifyPanel } from "./panels/ReclassifyPanel";
import { ResolutionPanel } from "./panels/ResolutionPanel";
import { AdminMessageComposer } from "./panels/AdminMessageComposer";

function fmtDate(d: string | null | undefined) {
  return d ? new Date(d).toLocaleString("vi-VN") : "N/A";
}

interface Props {
  ticketId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const SupportTicketDetailDrawer: React.FC<Props> = ({ ticketId, isOpen, onClose }) => {
  const { data: ticket, isLoading } = useTicketDetail(ticketId);

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <SheetTitle className="flex items-center gap-2 text-base font-bold">
            <FileText className="w-4 h-4 text-primary" />
            {isLoading ? <Skeleton className="h-5 w-32" /> : ticket?.ticketCode ?? "Chi tiết ticket"}
          </SheetTitle>
          <SheetDescription asChild>
            <span className="text-xs text-muted-foreground line-clamp-1">
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
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-5">
              {/* ── Info grid ── */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoItem label="Trạng thái">
                  <Badge variant="outline" className={`text-xs ${TONE_BADGE_CLASS[STATUS_TONE[ticket.status]]}`}>
                    {STATUS_LABEL[ticket.status]}
                  </Badge>
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
                    <span className="text-red-500 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Vi phạm
                    </span>
                  ) : (
                    <span className="text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Trong hạn
                    </span>
                  )}
                </InfoItem>
                <InfoItem label="Ngày tạo">
                  <span className="text-xs">{fmtDate(ticket.createdAt)}</span>
                </InfoItem>
                {ticket.status === "PENDING" && ticket.pendingReason && (
                  <InfoItem label="Lý do tạm chờ">
                    <span className="text-xs">{PENDING_REASON_LABEL[ticket.pendingReason]}</span>
                  </InfoItem>
                )}
              </div>

              {ticket.description && (
                <div className="rounded-xl bg-muted/40 border border-border/40 p-3 text-sm text-foreground/80">
                  <p className="text-xs font-bold text-muted-foreground mb-1.5">Mô tả</p>
                  {ticket.description}
                </div>
              )}

              {/* ── Tabs ── */}
              <Tabs defaultValue="messages">
                <TabsList className="w-full rounded-xl bg-muted/50">
                  <TabsTrigger value="messages" className="flex-1 text-xs">
                    <MessageSquare className="w-3.5 h-3.5 mr-1" />
                    Tin nhắn ({ticket.messages.length})
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

                {/* Messages */}
                <TabsContent value="messages" className="space-y-3 mt-4">
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {ticket.messages.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Chưa có tin nhắn</p>
                    ) : (
                      ticket.messages.map((m) => (
                        <div
                          key={m.id}
                          className={`rounded-xl p-3 text-sm border ${
                            m.isInternal
                              ? "bg-amber-500/5 border-amber-500/20"
                              : "bg-muted/40 border-border/30"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            {m.isInternal ? (
                              <Lock className="w-3 h-3 text-amber-500" />
                            ) : (
                              <User className="w-3 h-3 text-muted-foreground" />
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {m.isInternal ? "Ghi chú nội bộ" : "Công khai"} · {fmtDate(m.createdAt)}
                            </span>
                          </div>
                          <p className="text-foreground/80">{m.body}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <AdminMessageComposer ticketId={ticket.id} />
                </TabsContent>

                {/* Actions */}
                <TabsContent value="actions" className="space-y-5 mt-4">
                  <StatusChangePanel ticket={ticket} />
                  <ReclassifyPanel ticket={ticket} />
                  <AssignPanel ticket={ticket} />
                  <ResolutionPanel ticket={ticket} />
                </TabsContent>

                {/* History */}
                <TabsContent value="history" className="space-y-2 mt-4">
                  {ticket.statusLogs.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Chưa có lịch sử</p>
                  ) : (
                    ticket.statusLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2.5 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div>
                          <p className="text-foreground/80">
                            {log.oldStatus ? (
                              <>
                                <span className="font-medium">{STATUS_LABEL[log.oldStatus]}</span>
                                {" → "}
                                <span className="font-bold text-primary">{STATUS_LABEL[log.newStatus]}</span>
                              </>
                            ) : (
                              <span className="font-bold text-primary">Tạo: {STATUS_LABEL[log.newStatus]}</span>
                            )}
                          </p>
                          {log.note && <p className="text-muted-foreground italic">&quot;{log.note}&quot;</p>}
                          <p className="text-muted-foreground/60">{fmtDate(log.createdAt)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        ) : (
          <div className="p-6 text-center text-muted-foreground text-sm">Không tìm thấy ticket</div>
        )}
      </SheetContent>
    </Sheet>
  );
};

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground/80">{children}</div>
    </div>
  );
}
