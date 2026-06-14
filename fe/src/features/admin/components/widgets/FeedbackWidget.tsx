"use client";

import { Card, CardContent } from "@/components/ui/card";

export function FeedbackWidget() {
  const feedbacks = [
    { name: "Võ Minh Hoàng", rating: "5.0 ★", comment: "Tasker làm rất kỹ, sạch bong kin kít!" },
    { name: "Ngô Thị Hương", rating: "5.0 ★", comment: "Đúng giờ, thân thiện, sẽ đặt lại." },
    { name: "Bùi Văn Sơn", rating: "4.0 ★", comment: "Ổn nhưng tới hơi trễ 10 phút." },
  ];

  return (
    <Card className="border border-border bg-card shadow-sm rounded-2xl h-full flex flex-col justify-between">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Feedback mới nhất</h3>
          </div>
          <span className="text-xs text-primary font-medium cursor-pointer hover:underline">Xem tất cả</span>
        </div>
        <div className="flex flex-col gap-3">
          {feedbacks.map((f, i) => (
            <div
              key={i}
              className="pb-3 border-b border-border last:border-none last:pb-0"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-foreground">{f.name}</span>
                <span className="text-xs text-amber-500 font-bold">{f.rating}</span>
              </div>
              <p className="text-[12.5px] text-muted-foreground italic">"{f.comment}"</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
