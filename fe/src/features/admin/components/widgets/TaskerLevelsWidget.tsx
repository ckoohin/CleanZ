"use client";

import { Card, CardContent } from "@/components/ui/card";

export function TaskerLevelsWidget() {
  const rows = [
    { label: "Platinum", count: 12, color: "#534ab7" },
    { label: "Gold", count: 38, color: "#b45309" },
    { label: "Silver", count: 67, color: "#888780" },
    { label: "Bronze", count: 83, color: "#d85a30" },
  ];
  const max = 83;
  const total = 200;

  return (
    <Card className="border border-border bg-card shadow-sm rounded-2xl h-full flex flex-col justify-between">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Phân bố level Tasker</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{total} tasker đang hoạt động</p>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 mt-3">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3 text-[12.5px]">
              <span className="w-[38%] text-muted-foreground truncate">{r.label}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(r.count / max) * 100}%`, backgroundColor: r.color }}
                />
              </div>
              <span className="w-[52px] text-right font-semibold text-foreground">{r.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
