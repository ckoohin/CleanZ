"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function WidgetSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card className="border-border/40 bg-card/40 backdrop-blur-sm rounded-[2rem] h-full">
      <CardHeader className="p-6 pb-3">
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent className="p-6 pt-2 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
