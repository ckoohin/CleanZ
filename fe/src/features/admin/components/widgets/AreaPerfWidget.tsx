"use client";

import { Card, CardContent } from "@/components/ui/card";

export function AreaPerfWidget() {
  const areas = [
    { name: "Q. Cầu Giấy (HN)", count: 86, color: "#1d9e75" },
    { name: "Q.1 (HCM)", count: 74, color: "#1d4ed8" },
    { name: "Q. Đống Đa (HN)", count: 61, color: "#534ab7" },
    { name: "Q. Bình Thạnh (HCM)", count: 58, color: "#b45309" },
    { name: "TP. Thủ Đức (HCM)", count: 45, color: "#d85a30" },
  ];
  const max = 86;

  return (
    <Card className="border border-border bg-card shadow-sm rounded-2xl h-full flex flex-col justify-between">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Đơn theo khu vực</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Top khu vực · tháng này</p>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 mt-3">
          {areas.map((a) => (
            <div key={a.name} className="flex items-center gap-3 text-[12.5px]">
              <span className="w-[38%] text-muted-foreground truncate">{a.name}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(a.count / max) * 100}%`, backgroundColor: a.color }}
                />
              </div>
              <span className="w-[52px] text-right font-semibold text-foreground">{a.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
