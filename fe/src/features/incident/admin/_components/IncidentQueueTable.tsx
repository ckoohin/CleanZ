"use client";

import React, { useCallback, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BaseTableList,
  type Column,
  type RowAction,
} from "@/components/ui/base/base_table_list";
import { AdminButton } from "@/components/admin";
import {
  Eye,
  ListFilter,
  ArrowDownUp,
  AlertTriangle,
  Settings,
  Plus,
} from "lucide-react";
import {
  useAdminIncidents,
  useCustomerLookup,
  useTaskerLookup,
} from "../hooks/useAdminIncident";
import { LookupCombobox } from "./LookupCombobox";
import { IncidentDetailDrawer } from "./IncidentDetailDrawer";
import { FromTicketDialog } from "./FromTicketDialog";
import { IncidentConfigForm } from "./IncidentConfigForm";
import {
  IncidentStatusBadge,
  SeverityBadge,
} from "@/features/incident/shared/_components/badges";
import { formatVnd } from "@/features/incident/shared/incident.labels";
import {
  INCIDENT_STATUS,
  SEVERITY,
  type IncidentStatus,
  type Severity,
} from "@/features/incident/shared/incident.enums";
import {
  STATUS_LABEL,
  SEVERITY_LABEL,
} from "@/features/incident/shared/incident.labels";
import type {
  AdminIncidentQuery,
  IncidentSummary,
} from "@/features/incident/shared/incident.types";

const SORT_OPTIONS = [
  { value: "reportedAt", label: "Mới nhất" },
  { value: "severity", label: "Nghiêm trọng" },
  { value: "decisionDueAt", label: "Gần hạn QĐ" },
] as const;

export function IncidentQueueTable() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [selectedId, setSelectedId] = useState<string | null>(
    sp.get("incidentId"),
  );
  const [showCreate, setShowCreate] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [customerLabel, setCustomerLabel] = useState<string | null>(null);
  const [taskerLabel, setTaskerLabel] = useState<string | null>(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [taskerQuery, setTaskerQuery] = useState("");
  const customerLookup = useCustomerLookup(customerQuery);
  const taskerLookup = useTaskerLookup(taskerQuery);

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

  const apiParams: AdminIncidentQuery = {
    page,
    limit,
    ...(sel("status") !== "ALL" && { status: sel("status") as IncidentStatus }),
    ...(sel("severity") !== "ALL" && { severity: sel("severity") as Severity }),
    ...(sel("overdue") !== "ALL" && { overdue: sel("overdue") === "true" }),
    ...(get("customer") && { customerId: get("customer") }),
    ...(get("tasker") && { taskerId: get("tasker") }),
    ...(get("sort") && { sort: get("sort") as AdminIncidentQuery["sort"] }),
  };

  const { data, isLoading } = useAdminIncidents(apiParams);

  const columns: Column<IncidentSummary>[] = [
    {
      key: "incidentCode",
      title: "Sự cố",
      render: (r) => (
        <div>
          <p className="font-mono text-xs font-bold text-[var(--c-primary-strong)]">
            {r.incidentCode ?? "—"}
          </p>
          <p className="line-clamp-1 max-w-[220px] text-xs text-[var(--c-muted)]">
            {r.title}
          </p>
        </div>
      ),
    },
    {
      key: "severity",
      title: "Mức độ",
      hideOnMobile: true,
      render: (r) => <SeverityBadge severity={r.severity} />,
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (r) => (
        <IncidentStatusBadge status={r.status} />
      ),
    },
    {
      key: "claimedAmount",
      title: "Yêu cầu",
      hideOnMobile: true,
      render: (r) => (
        <span className="text-xs font-semibold">
          {formatVnd(r.claimedAmount)}
        </span>
      ),
    },
    {
      key: "approvedAmount",
      title: "Duyệt",
      hideOnMobile: true,
      render: (r) => (
        <span className="text-xs text-[#0E9F6E]">
          {formatVnd(r.approvedAmount)}
        </span>
      ),
    },
    {
      key: "reportedAt",
      title: "Báo cáo",
      hideOnMobile: true,
      render: (r) => (
        <span className="text-xs text-[var(--c-muted)]">
          {new Date(r.reportedAt).toLocaleDateString("vi-VN")}
        </span>
      ),
    },
  ];

  const rowActions: RowAction<IncidentSummary>[] = [
    {
      type: "view",
      label: "Xem chi tiết",
      icon: Eye,
      onClick: (r) => {
        setSelectedId(r.id);
        setParams({ incidentId: r.id }, false);
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <AdminButton
          size="sm"
          variant="secondary"
          className="rounded-full gap-1.5 text-xs font-semibold"
          onClick={() => setShowConfig(true)}
        >
          <Settings className="size-3.5" /> Cấu hình
        </AdminButton>
        <AdminButton
          size="sm"
          variant="primary"
          className="rounded-full gap-1.5 text-xs font-semibold"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="size-3.5" /> Tạo từ Ticket
        </AdminButton>
      </div>

      {/* Toolbar — 2 cụm filter đều nhau */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={sel("status")}
            onValueChange={(v) => setParams({ status: v })}
          >
            <SelectTrigger className="h-9 w-full rounded-lg border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-sm font-medium text-[var(--c-ink)] shadow-none">
              <ListFilter className="mr-1 size-3.5 shrink-0 text-[var(--c-muted)]" />
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent className="cz-admin rounded-xl bg-[var(--c-card)] text-[var(--c-ink)]">
              <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
              {INCIDENT_STATUS.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>


          <Select
            value={sel("severity")}
            onValueChange={(v) => setParams({ severity: v })}
          >
            <SelectTrigger className="h-9 w-full rounded-lg border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-sm font-medium text-[var(--c-ink)] shadow-none">
              <SelectValue placeholder="Mức độ" />
            </SelectTrigger>
            <SelectContent className="cz-admin rounded-xl bg-[var(--c-card)] text-[var(--c-ink)]">
              <SelectItem value="ALL">Tất cả mức độ</SelectItem>
              {SEVERITY.map((s) => (
                <SelectItem key={s} value={s}>
                  {SEVERITY_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sel("overdue")}
            onValueChange={(v) => setParams({ overdue: v })}
          >
            <SelectTrigger className="h-9 w-full rounded-lg border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-sm font-medium text-[var(--c-ink)] shadow-none">
              <SelectValue placeholder="Quá hạn" />
            </SelectTrigger>
            <SelectContent className="cz-admin rounded-xl bg-[var(--c-card)] text-[var(--c-ink)]">
              <SelectItem value="ALL">Tất cả</SelectItem>
              <SelectItem value="true">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-[#E11D48]" /> Quá hạn
                </div>
              </SelectItem>
              <SelectItem value="false">Trong hạn</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select
            value={get("sort") || "reportedAt"}
            onValueChange={(v) => setParams({ sort: v })}
          >
            <SelectTrigger className="h-9 w-full rounded-lg border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-sm font-medium text-[var(--c-ink)] shadow-none">
              <ArrowDownUp className="mr-1 size-3.5 shrink-0 text-[var(--c-muted)]" />
              <SelectValue placeholder="Sắp xếp" />
            </SelectTrigger>
            <SelectContent className="cz-admin rounded-xl bg-[var(--c-card)] text-[var(--c-ink)]">
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div />
          <LookupCombobox
            placeholder="Lọc khách hàng..."
            items={customerLookup.data ?? []}
            isLoading={customerLookup.isFetching}
            onQueryChange={setCustomerQuery}
            selectedKey={get("customer") || null}
            selectedLabel={
              customerLabel ?? (get("customer") ? "Đã chọn khách" : null)
            }
            onSelect={(it) => {
              setCustomerLabel(it.label);
              setParams({ customer: it.id });
            }}
            onClear={() => {
              setCustomerLabel(null);
              setParams({ customer: undefined });
            }}
          />
          <LookupCombobox
            placeholder="Lọc Tasker..."
            items={taskerLookup.data ?? []}
            isLoading={taskerLookup.isFetching}
            onQueryChange={setTaskerQuery}
            selectedKey={get("tasker") || null}
            selectedLabel={
              taskerLabel ?? (get("tasker") ? "Đã chọn Tasker" : null)
            }
            onSelect={(it) => {
              setTaskerLabel(it.label);
              setParams({ tasker: it.id });
            }}
            onClear={() => {
              setTaskerLabel(null);
              setParams({ tasker: undefined });
            }}
          />
        </div>
      </div>

      <BaseTableList
        columns={columns}
        data={data?.data ?? []}
        rowKey="id"
        totalItems={data?.meta?.total ?? 0}
        page={page}
        limit={limit}
        onPageChange={(p) => setParams({ page: String(p) }, false)}
        onLimitChange={(l) => setParams({ limit: String(l) })}
        isLoading={isLoading}
        emptyTitle="Chưa có sự cố nào"
        emptyDescription="Không có sự cố nào phù hợp bộ lọc."
        rowActions={rowActions}
        inlineActionCount={1}
      />

      {selectedId && (
        <IncidentDetailDrawer
          incidentId={selectedId}
          isOpen={!!selectedId}
          onClose={() => {
            setSelectedId(null);
            setParams({ incidentId: undefined }, false);
          }}
        />
      )}
      <FromTicketDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
      <IncidentConfigForm
        open={showConfig}
        onClose={() => setShowConfig(false)}
      />
    </div>
  );
}
