"use client";

import { Card, CardContent } from "@/components/ui/card";

export function ReviewsWidget() {
  const criteria = [
    { name: "Đúng giờ", value: 98 },
    { name: "Sạch sẽ", value: 94 },
    { name: "Thân thiện", value: 96 },
    { name: "Vui vẻ", value: 92 },
  ];

  return (
    <Card className="border border-border bg-card shadow-sm rounded-2xl h-full flex flex-col justify-between">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Đánh giá</h3>
          </div>
        </div>
        <div className="flex items-baseline gap-2 mb-3.5">
          <span className="text-3xl font-bold text-foreground">4.8</span>
          <span className="text-[12.5px] text-muted-foreground">★ · 320 đánh giá</span>
        </div>
        <div className="flex flex-col gap-3">
          {criteria.map((c) => (
            <div key={c.name} className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-muted-foreground font-medium">
                <span>{c.name}</span>
                <span className="font-semibold text-foreground">{c.value}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full"
                  style={{ width: `${c.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
