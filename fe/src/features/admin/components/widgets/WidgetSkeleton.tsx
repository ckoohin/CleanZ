"use client";

import { AdminCard } from "@/components/admin";

export function WidgetSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <AdminCard className="h-full">
      <div className="p-6 pb-3">
        <div className="h-5 w-36 animate-pulse rounded bg-[var(--c-card-2)]" />
      </div>
      <div className="p-6 pt-2 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-4 w-full animate-pulse rounded bg-[var(--c-card-2)]" />
        ))}
      </div>
    </AdminCard>
  );
}
