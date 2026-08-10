"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldAlert, ChevronRight } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useTaskerIncidents } from "../hooks/useTaskerIncident";
import {
  IncidentStatusBadge,
  SeverityBadge,
} from "@/features/incident/shared/_components/badges";
import { formatVnd } from "@/features/incident/shared/incident.labels";

export function TaskerIncidentList() {
  const router = useRouter();
  const { data, isLoading } = useTaskerIncidents({ page: 1, limit: 20 });
  const items = data?.data ?? [];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/50 bg-card px-4 py-3 shadow-sm">
        <button onClick={() => router.back()} className="rounded-full p-1.5 hover:bg-muted" aria-label="Quay lại">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-base font-bold">Sự cố liên quan tới bạn</h1>
      </header>

      <div className="space-y-3 p-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-border/50 bg-card" />
          ))
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <ShieldAlert className="mx-auto mb-2 size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Bạn không có sự cố nào</p>
          </div>
        ) : (
          items.map((it) => (
            <button
              key={it.id}
              onClick={() => router.push(ROUTES.TASKER.INCIDENT_DETAIL(it.id))}
              className="w-full rounded-2xl border border-border/50 bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/30"
            >
              <div className="mb-1 flex items-center gap-1.5">
                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  {it.incidentCode ?? "—"}
                </span>
                <SeverityBadge severity={it.severity} />
              </div>
              <h3 className="line-clamp-1 text-sm font-semibold">{it.title}</h3>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IncidentStatusBadge status={it.status} audience="tasker" />
                  <span className="text-xs font-semibold text-foreground/70">{formatVnd(it.claimedAmount)}</span>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
