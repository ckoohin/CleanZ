"use client";

import React from "react";
import { ArrowRight, Bot, ShieldCheck, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminIncidentHistory } from "../../hooks/useAdminIncident";
import {
  STATUS_LABEL,
  VERIFICATION_STATUS_LABEL,
} from "@/features/incident/shared/incident.labels";
import type { IncidentHistoryEntry } from "@/features/incident/shared/incident.types";

function fmt(d: string) {
  return new Date(d).toLocaleString("vi-VN");
}

/**
 * Nhật ký ghi giá trị THÔ của nhiều trục khác nhau: trạng thái hồ sơ, trạng thái thẩm
 * định hạng mục, và cả chuỗi mô tả sổ chi ngoài. Dịch được thì dịch, không thì trả lại
 * nguyên văn — bịa một nhãn đẹp cho giá trị mình không hiểu là làm hỏng chính thứ mà
 * nhật ký tồn tại để phục vụ.
 */
function labelOf(value: string): string {
  return (
    (STATUS_LABEL as Record<string, string>)[value] ??
    VERIFICATION_STATUS_LABEL[value] ??
    value
  );
}

const ACTOR: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; text: string }
> = {
  ADMIN: { icon: ShieldCheck, text: "Admin" },
  USER: { icon: User, text: "Người dùng" },
  SYSTEM: { icon: Bot, text: "Hệ thống tự động" },
};

function Actor({ entry }: { entry: IncidentHistoryEntry }) {
  const meta = entry.actorType ? ACTOR[entry.actorType] : undefined;
  const Icon = meta?.icon ?? User;
  // Tên người + loại chủ thể là hai thông tin khác nhau, và trường hợp đáng chú ý nhất là
  // khi chỉ có một trong hai: `SYSTEM` không bao giờ có tên (housekeeping tự chạy), còn
  // bản ghi cũ thì không có `actorType`. Gộp lại thành một chuỗi sẽ mất đúng phân biệt đó.
  const who =
    entry.changedByName ??
    (entry.actorType === "SYSTEM" ? "Không có người thao tác" : "Không rõ");

  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-[var(--c-muted)]">
      <Icon className="size-3" />
      {who}
      {meta && entry.changedByName && ` · ${meta.text}`}
    </span>
  );
}

/**
 * Nhật ký vòng đời hồ sơ.
 *
 * `incident_status_logs` được ghi ở mọi bước từ đầu, nhưng không API nào đọc và không màn
 * hình nào hiện — nghĩa là dấu vết có mà không tra được. Điều đó đặc biệt đáng kể ở module
 * này: duyệt cấp hai đã được gỡ, và kiểm soát thay thế chính là "mọi thao tác đều để lại
 * vết, xem được ngay trên hồ sơ".
 */
export function IncidentHistoryPanel({
  incidentId,
  enabled,
}: {
  incidentId: string;
  enabled: boolean;
}) {
  const { data, isLoading } = useAdminIncidentHistory(incidentId, enabled);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const entries = data ?? [];
  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-[var(--c-line)] bg-[var(--c-card-2)] p-3 text-xs text-[var(--c-muted)]">
        Chưa có thao tác nào được ghi nhận cho hồ sơ này.
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {entries.map((e) => (
        <li
          key={e.id}
          className="rounded-lg border border-[var(--c-line)] p-3 text-sm"
        >
          <div className="flex flex-wrap items-center gap-2">
            {e.dimension === "COMPENSATION" && (
              <span className="rounded-full bg-[#10B981]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#047857]">
                Dòng tiền
              </span>
            )}
            <span className="flex items-center gap-1.5 font-medium">
              {e.oldValue && (
                <>
                  <span className="text-[var(--c-muted)]">
                    {labelOf(e.oldValue)}
                  </span>
                  <ArrowRight className="size-3 text-[var(--c-muted)]" />
                </>
              )}
              {labelOf(e.newValue)}
            </span>
            <span className="ml-auto text-[11px] text-[var(--c-muted)]">
              {fmt(e.createdAt)}
            </span>
          </div>

          {e.reason && (
            <p className="mt-1 whitespace-pre-wrap text-xs leading-snug text-[var(--c-ink-soft)]">
              {e.reason}
            </p>
          )}
          <div className="mt-1">
            <Actor entry={e} />
          </div>
        </li>
      ))}
    </ol>
  );
}
