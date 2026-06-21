"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BaseTableList, type Column, type RowAction } from "@/components/ui/base/base_table_list";
import { useTicketList } from "../hooks/useSupportTicket";
import type {
  TicketSummary,
  TicketStatus,
  TicketCategory,
  TicketPriority,
} from "../types/support-ticket.types";
import { AlertTriangle, CheckCircle2, Eye, Plus, ListFilter, Settings } from "lucide-react";
import { SupportTicketDetailDrawer } from "./SupportTicketDetailDrawer";
import { CreateTicketDialog } from "./CreateTicketDialog";
import { TicketConfigForm } from "./config/TicketConfigForm";
import {
  STATUS_LABEL,
  STATUS_TONE,
  PRIORITY_LABEL,
  PRIORITY_TONE,
  CATEGORY_LABEL,
  CATEGORY_OPTIONS,
  TONE_BADGE_CLASS,
} from "@/features/support-tickets/shared/ticket.labels";
import { TICKET_STATUS, TICKET_PRIORITY } from "@/features/support-tickets/shared/ticket.enums";

// ─── Badges (SSOT-driven) ─────────────────────────────────────────────────────
function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1 text-xs font-semibold ${TONE_BADGE_CLASS[STATUS_TONE[status]]}`}
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <Badge className={`inline-flex items-center gap-1 text-xs ${TONE_BADGE_CLASS[PRIORITY_TONE[priority]]}`}>
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}

type SelectOrAll<T extends string> = T | "ALL";

// ─── Main Component ───────────────────────────────────────────────────────────
export const SupportTicketTable: React.FC = () => {
  const [filter, setFilter] = useState<{
    status: SelectOrAll<TicketStatus>;
    category: SelectOrAll<TicketCategory>;
    priority: SelectOrAll<TicketPriority>;
    slaBreached: boolean | "ALL";
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
  const [showConfig, setShowConfig] = useState(false);

  const apiParams = {
    page: filter.page,
    limit: filter.limit,
    ...(filter.status !== "ALL" && { status: filter.status }),
    ...(filter.category !== "ALL" && { category: filter.category }),
    ...(filter.priority !== "ALL" && { priority: filter.priority }),
    ...(filter.slaBreached !== "ALL" && { slaBreached: filter.slaBreached }),
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
        <span className="text-xs font-medium text-foreground/70">{CATEGORY_LABEL[row.category]}</span>
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
            <Badge className="bg-red-500/10 text-red-600 text-[10px] px-1.5 inline-flex items-center gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5" /> SLA
            </Badge>
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
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-full gap-1.5 text-xs font-semibold"
            onClick={() => setShowConfig(true)}
          >
            <Settings className="w-3.5 h-3.5" />
            Cấu hình
          </Button>
          <Button
            size="sm"
            className="rounded-full gap-1.5 text-xs font-semibold"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Tạo ticket hộ
          </Button>
        </div>
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
            {/* Trạng thái */}
            <Select
              value={filter.status}
              onValueChange={(val) =>
                setFilter((p) => ({ ...p, status: val as SelectOrAll<TicketStatus>, page: 1 }))
              }
            >
              <SelectTrigger className="h-10 min-w-[150px] rounded-full border-border/40 text-sm font-medium shadow-none">
                <ListFilter className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                {TICKET_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Loại */}
            <Select
              value={filter.category}
              onValueChange={(val) =>
                setFilter((p) => ({ ...p, category: val as SelectOrAll<TicketCategory>, page: 1 }))
              }
            >
              <SelectTrigger className="h-10 min-w-[150px] rounded-full border-border/40 text-sm font-medium shadow-none">
                <SelectValue placeholder="Loại" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">Tất cả loại</SelectItem>
                {CATEGORY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Độ ưu tiên */}
            <Select
              value={filter.priority}
              onValueChange={(val) =>
                setFilter((p) => ({ ...p, priority: val as SelectOrAll<TicketPriority>, page: 1 }))
              }
            >
              <SelectTrigger className="h-10 min-w-[140px] rounded-full border-border/40 text-sm font-medium shadow-none">
                <SelectValue placeholder="Độ ưu tiên" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">Tất cả mức ưu tiên</SelectItem>
                {TICKET_PRIORITY.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* SLA */}
            <Select
              value={filter.slaBreached === "ALL" ? "ALL" : filter.slaBreached ? "true" : "false"}
              onValueChange={(val) =>
                setFilter((p) => ({
                  ...p,
                  slaBreached: val === "ALL" ? "ALL" : val === "true",
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
      <CreateTicketDialog open={showCreate} onClose={() => setShowCreate(false)} />

      {/* Config Dialog */}
      <TicketConfigForm open={showConfig} onClose={() => setShowConfig(false)} />
    </>
  );
};
