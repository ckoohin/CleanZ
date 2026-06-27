"use client";

import React, { useState } from "react";
import { AdminButton } from "@/components/admin";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCheck } from "lucide-react";
import { useAssignTicket } from "../../hooks/useSupportTicket";
import { useAdminList } from "../../hooks/useAdminLookup";
import type { TicketAdminDetail } from "../../types/support-ticket.types";

/**
 * Gán/đổi admin xử lý (PATCH /assign — body `{ assignedAdminId }`).
 * Chọn admin từ danh sách (GET /users?role=ADMIN) hoặc "Tự nhận" (body rỗng → BE gán admin đang thao tác).
 */
export function AssignPanel({ ticket }: { ticket: TicketAdminDetail }) {
  const assign = useAssignTicket(ticket.id);
  const { data: admins, isLoading } = useAdminList();
  const [adminId, setAdminId] = useState("");

  const submit = (assignedAdminId?: string) =>
    assign.mutate({ assignedAdminId }, { onSuccess: () => setAdminId("") });

  return (
    <section className="space-y-2" aria-labelledby="assign-panel-title">
      <p id="assign-panel-title" className="text-xs font-bold text-[var(--c-muted)] uppercase tracking-wide">
        Gán admin xử lý
      </p>

      <p className="text-xs text-[var(--c-muted)]">
        Hiện tại:{" "}
        <span className="font-semibold text-[var(--c-ink-soft)]">
          {ticket.assignedAdmin?.fullName ?? "Chưa gán"}
        </span>
      </p>

      <div className="flex gap-2">
        <Select value={adminId} onValueChange={setAdminId} disabled={isLoading}>
          <SelectTrigger className="h-9 rounded-lg text-sm flex-1 border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-[var(--c-ink)]" aria-label="Chọn admin">
            <SelectValue placeholder={isLoading ? "Đang tải admin..." : "Chọn admin..."} />
          </SelectTrigger>
          <SelectContent className="cz-admin">
            {(admins ?? []).length === 0 && (
              <div className="px-2 py-1.5 text-xs text-[var(--c-muted)]">
                {isLoading ? "Đang tải..." : "Không có admin"}
              </div>
            )}
            {(admins ?? []).map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.fullName}
                {a.email ? ` · ${a.email}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <AdminButton
          size="md"
          variant="secondary"
          className="rounded-lg shrink-0"
          onClick={() => submit(adminId)}
          disabled={!adminId || assign.isPending}
        >
          Gán
        </AdminButton>
      </div>

      <AdminButton
        size="md"
        variant="ghost"
        className="w-full rounded-lg"
        icon={<UserCheck className="w-3.5 h-3.5" />}
        onClick={() => submit(undefined)}
        disabled={assign.isPending}
      >
        {assign.isPending ? "Đang gán..." : "Tự nhận xử lý"}
      </AdminButton>
    </section>
  );
}
