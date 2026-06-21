import React from "react";
import { MessageSquare } from "lucide-react";
import type { Statement } from "../incident.types";

function fmt(d: string) {
  return new Date(d).toLocaleString("vi-VN");
}

/** Danh sách giải trình/đối chất (dùng chung Tasker đọc+gửi, Admin đọc). */
export function StatementThread({ statements }: { statements: Statement[] }) {
  if (statements.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-muted-foreground">Chưa có giải trình</p>
    );
  }
  return (
    <div className="space-y-2">
      {statements.map((s) => (
        <div key={s.id} className="rounded-xl border border-border/40 bg-muted/30 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <MessageSquare className="size-3" /> {fmt(s.createdAt)}
          </div>
          <p className="text-sm text-foreground/80">{s.body}</p>
        </div>
      ))}
    </div>
  );
}
