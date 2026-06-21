"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserCheck } from "lucide-react";
import { useAssignTicket } from "../../hooks/useSupportTicket";
import type { TicketAdminDetail } from "../../types/support-ticket.types";

/**
 * Gán/đổi admin xử lý (PATCH /assign — body `{ assignedAdminId }`).
 * Bỏ trống + "Tự nhận" ⇒ BE gán cho admin đang thao tác.
 */
export function AssignPanel({ ticket }: { ticket: TicketAdminDetail }) {
  const assign = useAssignTicket(ticket.id);
  const [adminId, setAdminId] = useState("");

  const submit = (assignedAdminId?: string) =>
    assign.mutate({ assignedAdminId }, { onSuccess: () => setAdminId("") });

  return (
    <section className="space-y-2" aria-labelledby="assign-panel-title">
      <p id="assign-panel-title" className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
        Gán admin xử lý
      </p>

      <p className="text-xs text-muted-foreground">
        Hiện tại:{" "}
        <span className="font-semibold text-foreground/80">
          {ticket.assignedAdmin?.fullName ?? "Chưa gán"}
        </span>
      </p>

      <div className="flex gap-2">
        <Input
          value={adminId}
          onChange={(e) => setAdminId(e.target.value)}
          placeholder="Admin ID (UUID)..."
          className="h-9 rounded-lg text-sm"
          aria-label="Admin ID cần gán"
        />
        <Button
          size="sm"
          variant="outline"
          className="rounded-lg shrink-0"
          onClick={() => submit(adminId.trim() || undefined)}
          disabled={!adminId.trim() || assign.isPending}
        >
          Gán
        </Button>
      </div>

      <Button
        size="sm"
        variant="ghost"
        className="w-full rounded-lg gap-1.5 text-xs"
        onClick={() => submit(undefined)}
        disabled={assign.isPending}
      >
        <UserCheck className="w-3.5 h-3.5" />
        {assign.isPending ? "Đang gán..." : "Tự nhận xử lý"}
      </Button>
    </section>
  );
}
