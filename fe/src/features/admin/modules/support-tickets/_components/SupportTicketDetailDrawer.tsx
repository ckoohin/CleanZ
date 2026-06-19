"use client";

import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useTicketDetail,
  useChangeTicketStatus,
  useAssignTicket,
  useAddTicketMessage,
  useAddResolution,
  useReclassifyTicket,
} from "../hooks/useSupportTicket";
import type {
  TicketStatus,
  TicketPriority,
  TicketCategory,
  ResolutionType,
} from "../types/support-ticket.types";
import {
  Clock,
  User,
  MessageSquare,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Send,
  Tag,
  History,
  FileText,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  OPEN: "Mở", PENDING_CUSTOMER: "Chờ KH", PENDING_ADMIN: "Chờ Admin",
  IN_PROGRESS: "Đang xử lý", ESCALATED: "Escalated",
  RESOLVED: "Đã giải quyết", CLOSED: "Đóng", CANCELLED: "Huỷ",
};

const RESOLUTION_TYPE_LABELS: Record<string, string> = {
  REFUND: "Hoàn tiền", COMPENSATION: "Bồi thường", TASKER_PENALTY: "Phạt Tasker",
  RECLEAN: "Làm lại", VOUCHER: "Voucher", NO_ACTION: "Không cần xử lý", EXPLANATION: "Giải thích",
};

const CATEGORY_LABELS: Record<string, string> = {
  BOOKING_ISSUE: "Đặt lịch", PAYMENT_ISSUE: "Thanh toán",
  TASKER_BEHAVIOR: "Hành vi Tasker", SERVICE_QUALITY: "Chất lượng",
  APP_BUG: "Lỗi app", ACCOUNT_ISSUE: "Tài khoản", OTHER: "Khác",
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "N/A";
  return new Date(d).toLocaleString("vi-VN");
}

interface Props {
  ticketId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const SupportTicketDetailDrawer: React.FC<Props> = ({
  ticketId,
  isOpen,
  onClose,
}) => {
  const { data: ticket, isLoading } = useTicketDetail(ticketId);
  const changeStatus = useChangeTicketStatus(ticketId);
  const addMessage = useAddTicketMessage(ticketId);
  const addResolution = useAddResolution(ticketId);
  const reclassify = useReclassifyTicket(ticketId);

  const [msgBody, setMsgBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [resolutionType, setResolutionType] = useState<ResolutionType | "">("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [newStatus, setNewStatus] = useState<TicketStatus | "">("");

  const handleSendMessage = () => {
    if (!msgBody.trim()) return;
    addMessage.mutate({ body: msgBody.trim(), isInternal }, {
      onSuccess: () => {
        setMsgBody("");
        setIsInternal(false);
      },
    });
  };

  const handleAddResolution = () => {
    if (!resolutionType) return;
    addResolution.mutate({ type: resolutionType as ResolutionType, note: resolutionNote || undefined }, {
      onSuccess: () => {
        setResolutionType("");
        setResolutionNote("");
      },
    });
  };

  const handleChangeStatus = () => {
    if (!newStatus) return;
    changeStatus.mutate({ status: newStatus as TicketStatus }, {
      onSuccess: () => setNewStatus(""),
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <SheetTitle className="flex items-center gap-2 text-base font-bold">
            <FileText className="w-4 h-4 text-primary" />
            {isLoading ? <Skeleton className="h-5 w-32" /> : (ticket?.ticketCode ?? "Chi tiết ticket")}
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
              {/* ── Info Grid ── */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoItem label="Trạng thái">
                  <Badge variant="outline" className="text-xs">
                    {STATUS_LABELS[ticket.status] ?? ticket.status}
                  </Badge>
                </InfoItem>
                <InfoItem label="Độ ưu tiên">
                  <span className="font-semibold">{ticket.priority}</span>
                </InfoItem>
                <InfoItem label="Loại">
                  <span>{CATEGORY_LABELS[ticket.category] ?? ticket.category}</span>
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

                {/* Messages Tab */}
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
                              {m.isInternal ? "Internal note" : "Public"} · {fmtDate(m.createdAt)}
                            </span>
                          </div>
                          <p className="text-foreground/80">{m.body}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Send Message */}
                  <div className="border border-border/40 rounded-xl p-3 space-y-2">
                    <Textarea
                      placeholder="Nhập tin nhắn..."
                      className="text-sm resize-none border-0 p-0 focus-visible:ring-0 shadow-none bg-transparent"
                      rows={3}
                      value={msgBody}
                      onChange={(e) => setMsgBody(e.target.value)}
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isInternal}
                          onChange={(e) => setIsInternal(e.target.checked)}
                          className="rounded"
                        />
                        <Lock className="w-3 h-3" /> Internal note
                      </label>
                      <Button
                        size="sm"
                        className="rounded-full gap-1.5 text-xs"
                        onClick={handleSendMessage}
                        disabled={!msgBody.trim() || addMessage.isPending}
                      >
                        <Send className="w-3 h-3" />
                        {addMessage.isPending ? "Đang gửi..." : "Gửi"}
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* Actions Tab */}
                <TabsContent value="actions" className="space-y-4 mt-4">
                  {/* Đổi trạng thái */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Đổi trạng thái</p>
                    <div className="flex gap-2">
                      <Select value={newStatus} onValueChange={(v) => setNewStatus(v as TicketStatus)}>
                        <SelectTrigger className="flex-1 h-9 rounded-lg text-sm">
                          <SelectValue placeholder="Chọn trạng thái mới..." />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABELS).map(([val, label]) => (
                            <SelectItem key={val} value={val}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        className="rounded-lg"
                        onClick={handleChangeStatus}
                        disabled={!newStatus || changeStatus.isPending}
                      >
                        {changeStatus.isPending ? "..." : "Cập nhật"}
                      </Button>
                    </div>
                  </div>

                  {/* Ghi nhận kết luận */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Ghi nhận kết luận</p>
                    <Select value={resolutionType} onValueChange={(v) => setResolutionType(v as ResolutionType)}>
                      <SelectTrigger className="h-9 rounded-lg text-sm w-full">
                        <SelectValue placeholder="Loại kết luận..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(RESOLUTION_TYPE_LABELS).map(([val, label]) => (
                          <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Ghi chú kết luận..."
                      className="text-sm resize-none rounded-lg"
                      rows={2}
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full rounded-lg gap-1.5"
                      onClick={handleAddResolution}
                      disabled={!resolutionType || addResolution.isPending}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {addResolution.isPending ? "Đang lưu..." : "Lưu kết luận"}
                    </Button>
                  </div>

                  {/* Resolutions list */}
                  {ticket.resolutions.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Kết luận đã ghi</p>
                      {ticket.resolutions.map((r) => (
                        <div key={r.id} className="rounded-lg bg-muted/40 border border-border/30 p-2.5 text-xs">
                          <p className="font-semibold text-foreground/80">{RESOLUTION_TYPE_LABELS[r.type] ?? r.type}</p>
                          {r.note && <p className="text-muted-foreground mt-0.5">{r.note}</p>}
                          {r.amount && <p className="text-primary font-bold">+{Number(r.amount).toLocaleString("vi-VN")}đ</p>}
                          <p className="text-muted-foreground/60 mt-0.5">{fmtDate(r.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* History Tab */}
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
                                <span className="font-medium">{STATUS_LABELS[log.oldStatus]}</span>
                                {" → "}
                                <span className="font-bold text-primary">{STATUS_LABELS[log.newStatus]}</span>
                              </>
                            ) : (
                              <span className="font-bold text-primary">Tạo: {STATUS_LABELS[log.newStatus]}</span>
                            )}
                          </p>
                          {log.note && <p className="text-muted-foreground italic">"{log.note}"</p>}
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
          <div className="p-6 text-center text-muted-foreground text-sm">
            Không tìm thấy ticket
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

// ─── Helper Component ─────────────────────────────────────────────────────────
function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground/80">{children}</div>
    </div>
  );
}
