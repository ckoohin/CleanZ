"use client";

import React, { useCallback, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BaseTableList, type Column, type RowAction } from "@/components/ui/base/base_table_list";
import { useTicketList, useAdminTicketUnreadRealtime } from "../hooks/useSupportTicket";
import { useAdminList, useCustomerLookup, useBookingLookup } from "../hooks/useAdminLookup";
import type {
  TicketSummary,
  TicketStatus,
  TicketCategory,
  TicketPriority,
  AdminTicketQueryParams,
} from "../types/support-ticket.types";
import { AlertTriangle, CheckCircle2, Eye, Plus, ListFilter, Settings, ArrowDownUp, Search, X } from "lucide-react";
import { SupportTicketDetailDrawer } from "./SupportTicketDetailDrawer";
import { CreateTicketDialog } from "./CreateTicketDialog";
import { TicketConfigForm } from "./config/TicketConfigForm";
import { LookupCombobox } from "./LookupCombobox";
import type {
  CustomerLookupItem,
  BookingLookupItem,
} from "../services/admin-lookup.service";
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

function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge variant="outline" className={`inline-flex items-center gap-1 text-xs font-semibold ${TONE_BADGE_CLASS[STATUS_TONE[status]]}`}>
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

const SORT_OPTIONS = [
  { value: "createdAt", label: "Mới nhất" },
  { value: "priority", label: "Ưu tiên cao" },
  { value: "dueAt", label: "Gần hạn SLA" },
] as const;

export const SupportTicketTable: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Nhãn hiển thị cho combobox (URL chỉ lưu id)
  const [reporterLabel, setReporterLabel] = useState<string | null>(null);
  const [bookingLabel, setBookingLabel] = useState<string | null>(null);
  const [reporterQuery, setReporterQuery] = useState("");
  const [bookingQuery, setBookingQuery] = useState("");
  const customerLookup = useCustomerLookup(reporterQuery);
  const bookingLookup = useBookingLookup(bookingQuery);
  const { data: admins } = useAdminList();

  // ── URL-state ──────────────────────────────────────────────────────────────
  const get = (k: string) => sp.get(k) ?? "";
  const sel = (k: string) => sp.get(k) ?? "ALL";

  const setParams = useCallback(
    (updates: Record<string, string | undefined>, resetPage = true) => {
      const next = new URLSearchParams(sp.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (!v || v === "ALL") next.delete(k);
        else next.set(k, v);
      });
      if (resetPage) next.delete("page");
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [sp, router, pathname],
  );

  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const limit = Math.max(1, Number(sp.get("limit") ?? 10));

  const apiParams: AdminTicketQueryParams = {
    page,
    limit,
    ...(sel("status") !== "ALL" && { status: sel("status") as TicketStatus }),
    ...(sel("category") !== "ALL" && { category: sel("category") as TicketCategory }),
    ...(sel("priority") !== "ALL" && { priority: sel("priority") as TicketPriority }),
    ...(sel("sla") !== "ALL" && { slaBreached: sel("sla") === "true" }),
    ...(get("assignee") && { assignedAdminId: get("assignee") }),
    ...(get("reporter") && { reporterUserId: get("reporter") }),
    ...(get("booking") && { bookingId: get("booking") }),
    ...(get("q") && { keyword: get("q") }),
    ...(get("sort") && { sort: get("sort") as AdminTicketQueryParams["sort"] }),
  };

  const { data: response, isLoading } = useTicketList(apiParams);
  useAdminTicketUnreadRealtime(); // tin mới của user → badge hàng đợi cập nhật

  const columns: Column<TicketSummary>[] = [
    {
      key: "ticketCode",
      title: "Ticket",
      render: (row) => (
        <div className="flex items-center gap-2">
          {!!row.unreadCount && row.unreadCount > 0 && (
            <span
              className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-white"
              title={`${row.unreadCount} tin chưa đọc`}
            >
              {row.unreadCount > 9 ? "9+" : row.unreadCount}
            </span>
          )}
          <div>
            <p className="font-bold text-xs text-primary">{row.ticketCode ?? "—"}</p>
            <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{row.subject}</p>
          </div>
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
      title: "Ưu tiên",
      hideOnMobile: true,
      render: (row) => <PriorityBadge priority={row.priority} />,
    },
    {
      key: "assignedAdmin",
      title: "Phụ trách",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs text-foreground/70">{row.assignedAdmin?.fullName ?? "—"}</span>
      ),
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
    { type: "view", label: "Xem chi tiết", icon: Eye, onClick: (row) => setSelectedId(row.id) },
  ];

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="mb-4 space-y-3">
        {/* Hàng 1: tìm kiếm + hành động */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              value={get("q")}
              onChange={(e) => setParams({ q: e.target.value })}
              placeholder="Tìm theo mã ticket hoặc tiêu đề..."
              className="h-10 rounded-full pl-9 pr-9 text-sm"
            />
            {get("q") && (
              <button
                type="button"
                aria-label="Xoá tìm kiếm"
                onClick={() => setParams({ q: undefined })}
                className="absolute right-3 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground/70 hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <div className="flex gap-2 sm:ml-auto">
            <Button size="sm" variant="outline" className="rounded-full gap-1.5 text-xs font-semibold" onClick={() => setShowConfig(true)}>
              <Settings className="w-3.5 h-3.5" /> Cấu hình
            </Button>
            <Button size="sm" className="rounded-full gap-1.5 text-xs font-semibold" onClick={() => setShowCreate(true)}>
              <Plus className="w-3.5 h-3.5" /> Tạo ticket hộ
            </Button>
          </div>
        </div>

        {/* Hàng 2: bộ lọc — chia 2 cụm đều nhau, mỗi cụm lưới 2×2 */}
        <div className="grid gap-3 lg:grid-cols-2">
          {/* Cụm trái: phân loại ticket */}
          <div className="grid grid-cols-2 gap-2">
            <Select value={sel("status")} onValueChange={(v) => setParams({ status: v })}>
              <SelectTrigger className="h-9 w-full rounded-lg border-border/40 text-sm font-medium shadow-none">
                <ListFilter className="w-3.5 h-3.5 mr-1 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                {TICKET_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sel("category")} onValueChange={(v) => setParams({ category: v })}>
              <SelectTrigger className="h-9 w-full rounded-lg border-border/40 text-sm font-medium shadow-none">
                <SelectValue placeholder="Loại" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">Tất cả loại</SelectItem>
                {CATEGORY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sel("priority")} onValueChange={(v) => setParams({ priority: v })}>
              <SelectTrigger className="h-9 w-full rounded-lg border-border/40 text-sm font-medium shadow-none">
                <SelectValue placeholder="Ưu tiên" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">Tất cả ưu tiên</SelectItem>
                {TICKET_PRIORITY.map((p) => (
                  <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sel("sla")} onValueChange={(v) => setParams({ sla: v })}>
              <SelectTrigger className="h-9 w-full rounded-lg border-border/40 text-sm font-medium shadow-none">
                <SelectValue placeholder="SLA" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">Tất cả SLA</SelectItem>
                <SelectItem value="true">
                  <div className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Vi phạm SLA</div>
                </SelectItem>
                <SelectItem value="false">
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Trong hạn</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cụm phải: phụ trách / sắp xếp / tra cứu */}
          <div className="grid grid-cols-2 gap-2">
            <Select value={sel("assignee")} onValueChange={(v) => setParams({ assignee: v })}>
              <SelectTrigger className="h-9 w-full rounded-lg border-border/40 text-sm font-medium shadow-none">
                <SelectValue placeholder="Phụ trách" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">Tất cả admin</SelectItem>
                {(admins ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={get("sort") || "createdAt"} onValueChange={(v) => setParams({ sort: v })}>
              <SelectTrigger className="h-9 w-full rounded-lg border-border/40 text-sm font-medium shadow-none">
                <ArrowDownUp className="w-3.5 h-3.5 mr-1 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="Sắp xếp" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <LookupCombobox<CustomerLookupItem>
              placeholder="Lọc khách hàng..."
              items={customerLookup.data ?? []}
              isLoading={customerLookup.isFetching}
              onQueryChange={setReporterQuery}
              getKey={(c) => c.userId}
              getLabel={(c) => c.fullName}
              getSub={(c) => [c.phone, c.email].filter(Boolean).join(" · ")}
              selectedKey={get("reporter") || null}
              selectedLabel={reporterLabel ?? (get("reporter") ? "Đã chọn khách" : null)}
              onSelect={(c) => {
                setReporterLabel(c.fullName);
                setParams({ reporter: c.userId });
              }}
              onClear={() => {
                setReporterLabel(null);
                setParams({ reporter: undefined });
              }}
            />

            <LookupCombobox<BookingLookupItem>
              placeholder="Lọc booking..."
              items={bookingLookup.data ?? []}
              isLoading={bookingLookup.isFetching}
              onQueryChange={setBookingQuery}
              getKey={(b) => b.id}
              getLabel={(b) => b.bookingCode ?? b.id}
              getSub={(b) => b.customerName ?? ""}
              selectedKey={get("booking") || null}
              selectedLabel={bookingLabel ?? (get("booking") ? "Đã chọn booking" : null)}
              onSelect={(b) => {
                setBookingLabel(b.bookingCode ?? b.id);
                setParams({ booking: b.id });
              }}
              onClear={() => {
                setBookingLabel(null);
                setParams({ booking: undefined });
              }}
            />
          </div>
        </div>
      </div>

      <BaseTableList
        columns={columns}
        data={response?.data ?? []}
        rowKey="id"
        totalItems={response?.meta?.total ?? 0}
        page={page}
        limit={limit}
        onPageChange={(p) => setParams({ page: String(p) }, false)}
        onLimitChange={(l) => setParams({ limit: String(l) })}
        isLoading={isLoading}
        emptyTitle="Chưa có ticket nào"
        emptyDescription="Chưa có yêu cầu hỗ trợ nào phù hợp với bộ lọc."
        rowActions={rowActions}
        inlineActionCount={1}
      />

      {selectedId && (
        <SupportTicketDetailDrawer
          ticketId={selectedId}
          isOpen={!!selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
      <CreateTicketDialog open={showCreate} onClose={() => setShowCreate(false)} />
      <TicketConfigForm open={showConfig} onClose={() => setShowConfig(false)} />
    </>
  );
};
