"use client";

import { Card, CardContent } from "@/components/ui/card";

export function VoucherPerfWidget() {
  const vouchers = [
    { code: "SUMMER25", used: 64, limit: 100, color: "#1d9e75" },
    { code: "NEWBIE50", used: 41, limit: 50, color: "#b45309" },
    { code: "WEEKEND10", used: 120, limit: 200, color: "#1d4ed8" },
  ];

  return (
    <Card className="border border-border bg-card shadow-sm rounded-2xl h-full flex flex-col justify-between">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Hiệu quả voucher</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Lượt dùng / giới hạn</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 mt-3">
          {vouchers.map((v) => {
            const pct = (v.used / v.limit) * 100;
            return (
              <div key={v.code} className="flex items-center gap-3 text-[12.5px]">
                <span className="w-[38%] font-semibold text-foreground truncate">{v.code}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: v.color }}
                  />
                </div>
                <span className="w-[60px] text-right font-medium text-muted-foreground shrink-0 text-xs">
                  {v.used}/{v.limit}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
