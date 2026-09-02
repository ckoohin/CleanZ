"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, ShieldAlert, ChevronRight } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useMyIncidents } from "../hooks/useCustomerIncident";
import {
  IncidentStatusBadge,
  SeverityBadge,
} from "@/features/incident/shared/_components/badges";
import { formatVnd } from "@/features/incident/shared/incident.labels";
import type { IncidentSummary } from "@/features/incident/shared/incident.types";

function IncidentCard({
  item,
  onClick,
}: {
  item: IncidentSummary;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl border border-border/50 bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/30"
    >
      <div className="mb-1 flex items-center gap-1.5">
        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
          {item.incidentCode ?? "—"}
        </span>
        <SeverityBadge severity={item.severity} />
      </div>
      <h3 className="line-clamp-1 text-sm font-semibold">{item.title}</h3>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IncidentStatusBadge status={item.status} audience="customer" />
          <span className="text-xs font-semibold text-foreground/70">
            {formatVnd(item.claimedAmount)}
          </span>
        </div>
        <ChevronRight className="size-4 text-muted-foreground" />
      </div>
    </button>
  );
}

export function MyIncidentListPage() {
  const router = useRouter();
  const { data, isLoading } = useMyIncidents({ page: 1, limit: 20 });
  const items = data?.data ?? [];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/50 bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-full p-1.5 hover:bg-muted"
            aria-label="Quay lại"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-base font-bold">Báo cáo sự cố của tôi</h1>
        </div>
        <button
          onClick={() => router.push(ROUTES.CUSTOMER.INCIDENT_REPORT)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white"
        >
          <Plus className="size-3.5" /> Báo cáo
        </button>
      </header>

      <div className="space-y-3 p-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-border/50 bg-card"
            />
          ))
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <ShieldAlert className="mx-auto mb-2 size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Bạn chưa gửi báo cáo sự cố nào
            </p>
          </div>
        ) : (
          items.map((it) => (
            <IncidentCard
              key={it.id}
              item={it}
              onClick={() =>
                router.push(ROUTES.CUSTOMER.INCIDENT_DETAIL(it.id))
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
