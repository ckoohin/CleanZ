"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BaseTableList, type Column } from "@/components/ui/base/base_table_list";
import {
  useNotificationHistory,
  useBroadcastNotification,
} from "../hooks/useAdminNotification";
import type {
  NotificationItem,
  NotificationType,
  BroadcastSegment,
} from "../types/notification.types";
import {
  Bell,
  Megaphone,
  Users,
  Sparkles,
  Send,
  ListFilter,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const TYPE_LABELS: Record<string, { label: string; className: string }> = {
  BOOKING: { label: "Đặt lịch", className: "bg-blue-500/10 text-blue-600" },
  PAYMENT: { label: "Thanh toán", className: "bg-emerald-500/10 text-emerald-600" },
  SYSTEM: { label: "Hệ thống", className: "bg-slate-500/10 text-slate-600" },
  PROMOTION: { label: "Khuyến mãi", className: "bg-primary/10 text-primary" },
  SUPPORT_TICKET: { label: "Hỗ trợ", className: "bg-amber-500/10 text-amber-600" },
  WALLET: { label: "Ví", className: "bg-purple-500/10 text-purple-600" },
  WITHDRAWAL: { label: "Rút tiền", className: "bg-rose-500/10 text-rose-600" },
};

// ─── Broadcast Dialog ─────────────────────────────────────────────────────────
function BroadcastDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const broadcast = useBroadcastNotification();
  const [form, setForm] = useState({
    segment: "ALL" as BroadcastSegment,
    type: "SYSTEM" as "PROMOTION" | "SYSTEM",
    title: "",
    content: "",
  });

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    broadcast.mutate(
      { segment: form.segment, type: form.type, title: form.title.trim(), content: form.content || undefined },
      { onSuccess: () => { onClose(); setForm({ segment: "ALL", type: "SYSTEM", title: "", content: "" }); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Megaphone className="w-4 h-4 text-primary" />
            Broadcast thông báo
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Loại thông báo</Label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v as "PROMOTION" | "SYSTEM" }))}>
                <SelectTrigger className="h-9 rounded-lg text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SYSTEM">Hệ thống</SelectItem>
                  <SelectItem value="PROMOTION">Khuyến mãi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Đối tượng</Label>
              <Select value={form.segment} onValueChange={(v) => setForm((p) => ({ ...p, segment: v as BroadcastSegment }))}>
                <SelectTrigger className="h-9 rounded-lg text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả</SelectItem>
                  <SelectItem value="CUSTOMER">Khách hàng</SelectItem>
                  <SelectItem value="TASKER">Tasker</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Tiêu đề *</Label>
            <Input
              placeholder="Tiêu đề thông báo..."
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="text-sm rounded-lg"
              maxLength={255}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Nội dung</Label>
            <Textarea
              placeholder="Nội dung thông báo (tuỳ chọn)..."
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              rows={3}
              className="text-sm rounded-lg resize-none"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={onClose}>Huỷ</Button>
          <Button
            size="sm"
            className="rounded-full gap-1.5"
            onClick={handleSubmit}
            disabled={!form.title.trim() || broadcast.isPending}
          >
            <Send className="w-3.5 h-3.5" />
            {broadcast.isPending ? "Đang gửi..." : "Broadcast"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const NotificationAdminPanel: React.FC = () => {
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [filter, setFilter] = useState<{
    type?: NotificationType | "ALL";
    page: number;
    limit: number;
  }>({ type: "ALL", page: 1, limit: 10 });

  const { data: response, isLoading } = useNotificationHistory({
    page: filter.page,
    limit: filter.limit,
    ...(filter.type !== "ALL" && { type: filter.type as NotificationType }),
  });

  const columns: Column<NotificationItem>[] = [
    {
      key: "title",
      title: "Tiêu đề",
      render: (row) => (
        <div>
          <p className="font-semibold text-sm text-foreground/90 line-clamp-1">{row.title}</p>
          {row.content && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{row.content}</p>
          )}
        </div>
      ),
    },
    {
      key: "type",
      title: "Loại",
      render: (row) => {
        const t = TYPE_LABELS[row.type];
        return (
          <Badge className={`text-xs ${t?.className ?? ""}`}>{t?.label ?? row.type}</Badge>
        );
      },
    },
    {
      key: "isRead",
      title: "Trạng thái",
      hideOnMobile: true,
      render: (row) =>
        row.isRead ? (
          <span className="text-xs text-muted-foreground">Đã đọc</span>
        ) : (
          <span className="text-xs font-bold text-primary">Chưa đọc</span>
        ),
    },
    {
      key: "createdAt",
      title: "Thời gian",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.createdAt).toLocaleString("vi-VN")}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div />
        <Button
          size="sm"
          className="rounded-full gap-1.5 text-xs font-semibold"
          onClick={() => setShowBroadcast(true)}
        >
          <Megaphone className="w-3.5 h-3.5" />
          Broadcast thông báo
        </Button>
      </div>

      <BaseTableList
        columns={columns}
        data={response?.data ?? []}
        rowKey="id"
        totalItems={response?.meta?.total ?? 0}
        page={filter.page}
        limit={filter.limit}
        onPageChange={(page) => setFilter((p) => ({ ...p, page }))}
        onLimitChange={(limit) => setFilter((p) => ({ ...p, limit, page: 1 }))}
        isLoading={isLoading}
        emptyTitle="Chưa có thông báo nào"
        emptyDescription="Lịch sử thông báo sẽ xuất hiện tại đây."
        rowActions={[]}
        inlineActionCount={0}
        filters={
          <Select
            value={filter.type}
            onValueChange={(v) =>
              setFilter((p) => ({ ...p, type: v as NotificationType | "ALL", page: 1 }))
            }
          >
            <SelectTrigger className="h-10 min-w-[160px] rounded-full border-border/40 text-sm font-medium shadow-none">
              <ListFilter className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Loại thông báo" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ALL">Tất cả loại</SelectItem>
              {Object.entries(TYPE_LABELS).map(([val, { label }]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <BroadcastDialog open={showBroadcast} onClose={() => setShowBroadcast(false)} />
    </>
  );
};
