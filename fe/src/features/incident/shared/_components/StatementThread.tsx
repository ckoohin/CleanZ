import React from "react";
import { MessageSquare, Shield, User, Wrench } from "lucide-react";
import type { Statement } from "../incident.types";

function fmt(d: string) {
  return new Date(d).toLocaleString("vi-VN");
}

const ROLE_META: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    cls: string;
  }
> = {
  TASKER: {
    label: "Tasker",
    icon: Wrench,
    cls: "bg-[#F59E0B]/15 text-[#B45309]",
  },
  CUSTOMER: {
    label: "Khách hàng",
    icon: User,
    cls: "bg-[#3B82F6]/15 text-[#1D4ED8]",
  },
  ADMIN: {
    label: "Quản trị viên",
    icon: Shield,
    cls: "bg-[#10B981]/15 text-[#047857]",
  },
};

/** Danh sách ý kiến giải trình (dùng chung Tasker đọc+gửi, Admin đọc). Có nhãn người viết. */
export function StatementThread({ statements }: { statements: Statement[] }) {
  if (statements.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        Chưa có ý kiến nào
      </p>
    );
  }
  return (
    <div className="space-y-2.5">
      {statements.map((s) => {
        const meta =
          (s.submittedByRole && ROLE_META[s.submittedByRole]) || null;
        const Icon = meta?.icon ?? MessageSquare;
        return (
          <div
            key={s.id}
            className="rounded-xl border border-border/40 bg-muted/30 p-3"
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  meta?.cls ?? "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="size-3" />
                {meta?.label ?? "Người dùng"}
                {s.submittedByName ? ` · ${s.submittedByName}` : ""}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {fmt(s.createdAt)}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-foreground/80">
              {s.body}
            </p>
          </div>
        );
      })}
    </div>
  );
}
