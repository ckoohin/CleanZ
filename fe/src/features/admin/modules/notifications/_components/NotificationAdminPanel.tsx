"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BaseTableList, type Column } from "@/components/ui/base/base_table_list";
import { AdminButton, StatusBadge, type BadgeTone } from "@/components/admin";
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
  Megaphone,
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

const TYPE_LABELS: Record<
  NotificationType,
  { label: string; tone: BadgeTone; color?: string; soft?: string }
> = {
  BOOKING_NEW_AVAILABLE: { label: "Đơn mới gần tasker", tone: "info" },
  BOOKING_CONFIRMED: { label: "Booking xác nhận", tone: "info" },
  TASKER_ON_THE_WAY: { label: "Tasker đang đến", tone: "info" },
  BOOKING_COMPLETED: { label: "Booking hoàn tất", tone: "success" },
  BOOKING_CANCELLED: { label: "Booking đã hủy", tone: "danger" },
  PAYMENT_SUCCESS: { label: "Thanh toán thành công", tone: "success" },
  PAYMENT_FAILED: { label: "Thanh toán thất bại", tone: "danger" },
  INCIDENT_UPDATE: { label: "Sự cố", tone: "warning" },
  SUPPORT_REPLY: { label: "Hỗ trợ", tone: "warning" },
  SYSTEM: { label: "Hệ thống", tone: "neutral" },
  PROMOTION: {
    label: "Khuyến mãi",
    tone: "neutral",
    color: "var(--c-primary-strong)",
    soft: "var(--c-primary-soft)",
  },
};

const FILTER_TYPES = Object.keys(TYPE_LABELS) as NotificationType[];

const inputClass =
  "text-sm rounded-xl bg-[var(--c-card-2)] border-[var(--c-line-strong)] focus:border-[var(--c-primary)]/50";

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
      <DialogContent className="cz-admin sm:max-w-md rounded-2xl bg-[var(--c-card)] border-[var(--c-line)] text-[var(--c-ink)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-[var(--c-ink)]">
            <Megaphone className="w-4 h-4 text-[var(--c-primary-strong)]" />
            Broadcast thông báo
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[var(--c-ink)]">Loại thông báo</Label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v as "PROMOTION" | "SYSTEM" }))}>
                <SelectTrigger className="h-9 rounded-xl text-sm bg-[var(--c-card-2)] border-[var(--c-line-strong)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="cz-admin">
                  <SelectItem value="SYSTEM">Hệ thống</SelectItem>
                  <SelectItem value="PROMOTION">Khuyến mãi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[var(--c-ink)]">Đối tượng</Label>
              <Select value={form.segment} onValueChange={(v) => setForm((p) => ({ ...p, segment: v as BroadcastSegment }))}>
                <SelectTrigger className="h-9 rounded-xl text-sm bg-[var(--c-card-2)] border-[var(--c-line-strong)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="cz-admin">
                  <SelectItem value="ALL">Tất cả</SelectItem>
                  <SelectItem value="CUSTOMER">Khách hàng</SelectItem>
                  <SelectItem value="TASKER">Tasker</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[var(--c-ink)]">Tiêu đề *</Label>
            <Input
              placeholder="Tiêu đề thông báo..."
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className={inputClass}
              maxLength={255}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[var(--c-ink)]">Nội dung</Label>
            <Textarea
              placeholder="Nội dung thông báo (tuỳ chọn)..."
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <AdminButton variant="secondary" size="sm" onClick={onClose}>Huỷ</AdminButton>
          <AdminButton
            variant="primary"
            size="sm"
            icon={<Send className="w-3.5 h-3.5" />}
            onClick={handleSubmit}
            disabled={!form.title.trim() || broadcast.isPending}
          >
            {broadcast.isPending ? "Đang gửi..." : "Broadcast"}
          </AdminButton>
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
          <p className="font-semibold text-sm text-[var(--c-ink)] line-clamp-1">{row.title}</p>
          {row.content && (
            <p className="text-xs text-[var(--c-muted)] line-clamp-1 mt-0.5">{row.content}</p>
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
          <StatusBadge tone={t?.tone ?? "neutral"} color={t?.color} soft={t?.soft}>
            {t?.label ?? row.type}
          </StatusBadge>
        );
      },
    },
    {
      key: "isRead",
      title: "Trạng thái",
      hideOnMobile: true,
      render: (row) =>
        row.isRead ? (
          <span className="text-xs text-[var(--c-muted)]">Đã đọc</span>
        ) : (
          <span className="text-xs font-bold text-[var(--c-primary-strong)]">Chưa đọc</span>
        ),
    },
    {
      key: "createdAt",
      title: "Thời gian",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs text-[var(--c-muted)]">
          {new Date(row.createdAt).toLocaleString("vi-VN")}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div />
        <AdminButton
          variant="primary"
          size="sm"
          icon={<Megaphone className="w-3.5 h-3.5" />}
          onClick={() => setShowBroadcast(true)}
        >
          Broadcast thông báo
        </AdminButton>
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
            <SelectTrigger className="h-10 min-w-[215px] rounded-full border-[var(--c-line)] bg-[var(--c-card-2)] text-sm font-medium shadow-none">
              <ListFilter className="w-3.5 h-3.5 mr-1 text-[var(--c-muted)]" />
              <SelectValue placeholder="Loại thông báo" />
            </SelectTrigger>
            <SelectContent className="cz-admin rounded-xl">
              <SelectItem value="ALL">Tất cả loại</SelectItem>
              {FILTER_TYPES.map((val) => (
                <SelectItem key={val} value={val}>{TYPE_LABELS[val].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <BroadcastDialog open={showBroadcast} onClose={() => setShowBroadcast(false)} />
    </>
  );
};
