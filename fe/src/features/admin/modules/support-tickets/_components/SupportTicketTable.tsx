"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BaseTableList, type Column, type RowAction } from "@/components/ui/base/base_table_list";
import {
  useTicketList,
} from "../hooks/useSupportTicket";
import type { TicketSummary, TicketStatus, TicketCategory, TicketPriority } from "../types/support-ticket.types";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Plus,
  ListFilter,
  ShieldAlert,
  Flame,
  ArrowUp,
  Minus,
} from "lucide-react";
import { SupportTicketDetailDrawer } from "./SupportTicketDetailDrawer";
import { CreateTicketDialog } from "./CreateTicketDialog";

// ─── Status Badge ──────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  OPEN: { label: "Mở", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", icon: <Clock className="w-3 h-3" /> },
  PENDING_CUSTOMER: { label: "Chờ KH", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20", icon: <Clock className="w-3 h-3" /> },
  PENDING_ADMIN: { label: "Chờ admin", className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20", icon: <Clock className="w-3 h-3" /> },
  IN_PROGRESS: { label: "Đang xử lý", className: "bg-primary/10 text-primary border-primary/20", icon: <Clock className="w-3 h-3" /> },
  ESCALATED: { label: "Escalated", className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20", icon: <AlertTriangle className="w-3 h-3" /> },
  RESOLVED: { label: "Đã giải quyết", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20", icon: <CheckCircle2 className="w-3 h-3" /> },
  CLOSED: { label: "Đóng", className: "bg-muted text-muted-foreground border-border/50", icon: <XCircle className="w-3 h-3" /> },
  CANCELLED: { label: "Huỷ", className: "bg-muted text-muted-foreground border-border/50", icon: <XCircle className="w-3 h-3" /> },
};

const PRIORITY_STYLES: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  LOW: { label: "Thấp", className: "bg-muted text-muted-foreground", icon: <Minus className="w-3 h-3" /> },
  MEDIUM: { label: "Trung bình", className: "bg-blue-500/10 text-blue-600", icon: <ArrowUp className="w-3 h-3" /> },
  HIGH: { label: "Cao", className: "bg-orange-500/10 text-orange-600", icon: <Flame className="w-3 h-3" /> },
  URGENT: { label: "Khẩn cấp", className: "bg-red-500/10 text-red-600 font-bold animate-pulse", icon: <ShieldAlert className="w-3 h-3" /> },
};

const CATEGORY_LABELS: Record<string, string> = {
  BOOKING_ISSUE: "Đặt lịch",
  PAYMENT_ISSUE: "Thanh toán",
  TASKER_BEHAVIOR: "Hành vi Tasker",
  SERVICE_QUALITY: "Chất lượng",
  APP_BUG: "Lỗi app",
  ACCOUNT_ISSUE: "Tài khoản",
  OTHER: "Khác",
};

function StatusBadge({ status }: { status: TicketStatus }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.OPEN;
  return (
    <Badge variant="outline" className={`inline-flex items-center gap-1 text-xs font-semibold ${s.className}`}>
      {s.icon} {s.label}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const p = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.MEDIUM;
  return (
    <Badge className={`inline-flex items-center gap-1 text-xs ${p.className}`}>
      {p.icon} {p.label}
    </Badge>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const SupportTicketTable: React.FC = () => {
  const [filter, setFilter] = useState<{
    status?: TicketStatus | "ALL";
    category?: TicketCategory | "ALL";
    priority?: TicketPriority | "ALL";
    slaBreached?: boolean | "ALL";
    keyword: string;
    page: number;
    limit: number;
  }>({
    status: "ALL",
    category: "ALL",
    priority: "ALL",
    slaBreached: "ALL",
    keyword: "",
    page: 1,
    limit: 10,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const apiParams = {
    page: filter.page,
    limit: filter.limit,
    ...(filter.status !== "ALL" && { status: filter.status as TicketStatus }),
    ...(filter.category !== "ALL" && { category: filter.category as TicketCategory }),
    ...(filter.priority !== "ALL" && { priority: filter.priority as TicketPriority }),
    ...(filter.slaBreached !== "ALL" && { slaBreached: filter.slaBreached as boolean }),
  };

  const { data: response, isLoading } = useTicketList(apiParams);

  const columns: Column<TicketSummary>[] = [
    {
      key: "ticketCode",
      title: "Ticket",
      render: (row) => (
        <div>
          <p className="font-bold text-xs text-primary">{row.ticketCode ?? "—"}</p>
          <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{row.subject}</p>
        </div>
      ),
    },
    {
      key: "category",
      title: "Loại",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs font-medium text-foreground/70">
          {CATEGORY_LABELS[row.category] ?? row.category}
        </span>
      ),
    },
    {
      key: "priority",
      title: "Độ ưu tiên",
      hideOnMobile: true,
      render: (row) => <PriorityBadge priority={row.priority} />,
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge status={row.status} />
          {row.slaBreached && (
            <Badge className="bg-red-500/10 text-red-600 text-[10px] px-1.5">SLA</Badge>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      title: "Ngày tạo",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.createdAt).toLocaleDateString("vi-VN")}
        </span>
      ),
    },
  ];

  const rowActions: RowAction<TicketSummary>[] = [
    {
      type: "view",
      label: "Xem chi tiết",
      icon: Eye,
      onClick: (row) => setSelectedId(row.id),
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div />
        <Button
          size="sm"
          className="rounded-full gap-1.5 text-xs font-semibold"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          Tạo ticket hộ
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
        keyword={filter.keyword}
        onKeywordChange={(keyword) => setFilter((p) => ({ ...p, keyword, page: 1 }))}
        placeholderSearch="Tìm theo mã ticket, nội dung..."
        isLoading={isLoading}
        emptyTitle="Chưa có ticket nào"
        emptyDescription="Chưa có yêu cầu hỗ trợ nào phù hợp với bộ lọc."
        rowActions={rowActions}
        inlineActionCount={1}
        filters={
          <div className="flex flex-wrap gap-2">
            {/* Status Filter */}
            <Select
              value={filter.status}
              onValueChange={(val) =>
                setFilter((p) => ({
                  ...p,
                  status: val as TicketStatus | "ALL",
                  page: 1,
                }))
              }
            >
              <SelectTrigger className="h-10 min-w-[150px] rounded-full border-border/40 text-sm font-medium shadow-none">
                <ListFilter className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                {Object.entries(STATUS_STYLES).map(([val, s]) => (
                  <SelectItem key={val} value={val}>
                    <div className="flex items-center gap-1.5">{s.icon}{s.label}</div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select
              value={filter.priority}
              onValueChange={(val) =>
                setFilter((p) => ({
                  ...p,
                  priority: val as TicketPriority | "ALL",
                  page: 1,
                }))
              }
            >
              <SelectTrigger className="h-10 min-w-[140px] rounded-full border-border/40 text-sm font-medium shadow-none">
                <SelectValue placeholder="Độ ưu tiên" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">Tất cả mức ưu tiên</SelectItem>
                {Object.entries(PRIORITY_STYLES).map(([val, p]) => (
                  <SelectItem key={val} value={val}>
                    <div className="flex items-center gap-1.5">{p.icon}{p.label}</div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* SLA Breached Filter */}
            <Select
              value={
                filter.slaBreached === "ALL"
                  ? "ALL"
                  : filter.slaBreached
                  ? "true"
                  : "false"
              }
              onValueChange={(val) =>
                setFilter((p) => ({
                  ...p,
                  slaBreached:
                    val === "ALL" ? "ALL" : val === "true" ? true : false,
                  page: 1,
                }))
              }
            >
              <SelectTrigger className="h-10 min-w-[130px] rounded-full border-border/40 text-sm font-medium shadow-none">
                <SelectValue placeholder="SLA" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">Tất cả SLA</SelectItem>
                <SelectItem value="true">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Đã vi phạm SLA
                  </div>
                </SelectItem>
                <SelectItem value="false">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Trong hạn SLA
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Detail Drawer */}
      {selectedId && (
        <SupportTicketDetailDrawer
          ticketId={selectedId}
          isOpen={!!selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* Create Dialog */}
      <CreateTicketDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </>
  );
};
