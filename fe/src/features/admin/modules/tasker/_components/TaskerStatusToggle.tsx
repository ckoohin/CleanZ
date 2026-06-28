"use client";

import React, { useState } from "react";
import { StatusBadge, type BadgeTone } from "@/components/admin";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusSwitch } from "@/components/ui/base/status_switch";
import { useBanTasker, useUnbanTasker } from "../hooks/admin-tasker.hooks";
import { ACCOUNT_STATUS_LABELS } from "../constants";
import type { BanType, TaskerAccountStatus } from "../types/admin-tasker.types";

// Account status → semantic badge tone (design system §2).
const ACCOUNT_STATUS_TONE: Record<string, BadgeTone> = {
  PENDING: "warning",
  TRAINING: "info",
  ACTIVE: "success",
  SUSPENDED: "warning",
  REJECTED: "danger",
  TERMINATED: "danger",
};

interface TaskerStatusToggleProps {
  taskerId: string;
  status: TaskerAccountStatus;
  fullName: string;
}

export const TaskerStatusToggle: React.FC<TaskerStatusToggleProps> = ({
  taskerId,
  status,
  fullName,
}) => {
  const [banOpen, setBanOpen] = useState(false);
  const [unbanOpen, setUnbanOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [banType, setBanType] = useState<BanType>("TEMPORARY");
  // Số ngày khóa cho hình thức TEMPORARY (mặc định 7, 1–365).
  const [durationDays, setDurationDays] = useState(7);

  const banMutation = useBanTasker();
  const unbanMutation = useUnbanTasker();

  if (status !== "ACTIVE" && status !== "SUSPENDED") {
    return (
      <StatusBadge tone={ACCOUNT_STATUS_TONE[status] ?? "neutral"}>
        {ACCOUNT_STATUS_LABELS[status] || status}
      </StatusBadge>
    );
  }

  const isActive = status === "ACTIVE";

  const handleToggleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isActive) {
      setReason("");
      setBanType("TEMPORARY");
      setDurationDays(7);
      setBanOpen(true);
    } else {
      setUnbanOpen(true);
    }
  };

  const handleBan = () => {
    if (!reason.trim()) return;
    banMutation.mutate(
      {
        id: taskerId,
        reason: reason.trim(),
        type: banType,
        // PERMANENT bỏ qua durationDays; TEMPORARY gửi số ngày đã chọn.
        ...(banType === "TEMPORARY" ? { durationDays } : {}),
      },
      { onSuccess: () => setBanOpen(false) }
    );
  };

  const handleUnban = () => {
    unbanMutation.mutate(taskerId, { onSuccess: () => setUnbanOpen(false) });
  };

  return (
    <>
      <StatusSwitch
        checked={isActive}
        disabled={banMutation.isPending || unbanMutation.isPending}
        onClick={handleToggleClick}
        ariaLabel={`${isActive ? "Đình chỉ" : "Gỡ khóa"} tài khoản ${fullName}`}
        activeLabel="Đang hoạt động"
        inactiveLabel="Bị đình chỉ"
      />

      <Dialog open={banOpen} onOpenChange={setBanOpen}>
        <DialogContent className="cz-admin sm:max-w-md rounded-[20px] border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--c-ink)]">Đình chỉ / Khóa tài khoản tasker</DialogTitle>
            <DialogDescription className="pt-1 text-sm text-[var(--c-muted)]">
              Bạn đang khóa tài khoản của <strong>{fullName}</strong>. Chọn hình thức và
              nêu rõ lý do.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-[var(--c-ink-soft)]">Hình thức</Label>
              <Select value={banType} onValueChange={(v) => setBanType(v as BanType)}>
                <SelectTrigger className="rounded-xl bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]">
                  <SelectValue placeholder="Chọn hình thức" />
                </SelectTrigger>
                <SelectContent className="cz-admin rounded-xl border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)]">
                  <SelectItem value="TEMPORARY">Đình chỉ tạm thời</SelectItem>
                  <SelectItem value="PERMANENT">Khóa vĩnh viễn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {banType === "TEMPORARY" && (
              <div className="space-y-2">
                <Label className="text-[var(--c-ink-soft)]">Số ngày khóa</Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={durationDays}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isNaN(v)) return;
                    setDurationDays(Math.min(365, Math.max(1, Math.floor(v))));
                  }}
                  className="rounded-xl bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]"
                />
                <p className="text-xs text-[var(--c-muted)]">
                  Tài khoản sẽ tự mở khóa sau {durationDays} ngày (1–365).
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-[var(--c-ink-soft)]">Lý do</Label>
              <Textarea
                placeholder="Nhập lý do cụ thể..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[100px] rounded-xl resize-none bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setBanOpen(false)}
              disabled={banMutation.isPending}
              className="rounded-full border-[var(--c-line-strong)] bg-[var(--c-card)] text-[var(--c-ink-soft)] hover:text-[var(--c-ink)]"
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleBan}
              disabled={banMutation.isPending || !reason.trim()}
              className="rounded-full"
            >
              {banMutation.isPending ? "Đang xử lý..." : "Xác nhận khóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={unbanOpen} onOpenChange={setUnbanOpen}>
        <DialogContent className="cz-admin sm:max-w-md rounded-[20px] border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--c-ink)]">Gỡ khóa tài khoản tasker</DialogTitle>
            <DialogDescription className="pt-1 text-sm text-[var(--c-muted)]">
              Khôi phục hoạt động cho <strong>{fullName}</strong>? Tasker sẽ được nhận việc
              trở lại.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setUnbanOpen(false)}
              disabled={unbanMutation.isPending}
              className="rounded-full border-[var(--c-line-strong)] bg-[var(--c-card)] text-[var(--c-ink-soft)] hover:text-[var(--c-ink)]"
            >
              Hủy
            </Button>
            <Button
              onClick={handleUnban}
              disabled={unbanMutation.isPending}
              className="rounded-full bg-[var(--c-primary)] text-white hover:bg-[var(--c-primary)]/90"
            >
              {unbanMutation.isPending ? "Đang xử lý..." : "Gỡ khóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
