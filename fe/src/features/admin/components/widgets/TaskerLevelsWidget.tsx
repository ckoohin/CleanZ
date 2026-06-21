"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useTaskerLevels } from "../../hooks/useDashboard";
import { WidgetSkeleton } from "./WidgetSkeleton";

const FALLBACK_COLORS = ["#534ab7", "#b45309", "#888780", "#d85a30", "#0e7490"];

export function TaskerLevelsWidget() {
  const { data, isLoading } = useTaskerLevels();

  if (isLoading) return <WidgetSkeleton rows={4} />;

  const rows = data ?? [];
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <Card className="border border-border bg-card shadow-sm rounded-2xl h-full flex flex-col justify-between">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Phân bố level Tasker</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {total} tasker đang hoạt động
            </p>
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            Chưa cấu hình level tasker
          </p>
        ) : (
          <div className="flex flex-col gap-2.5 mt-3">
            {rows.map((r, i) => (
              <div key={r.label} className="flex items-center gap-3 text-[12.5px]">
                <span className="w-[38%] text-muted-foreground truncate">{r.label}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(r.count / max) * 100}%`,
                      backgroundColor: r.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
                    }}
                  />
                </div>
                <span className="w-[52px] text-right font-semibold text-foreground">
                  {r.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
