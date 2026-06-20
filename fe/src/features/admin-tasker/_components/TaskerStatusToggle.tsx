"use client";

import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useBanTasker, useUnbanTasker } from "../hooks/admin-tasker.hooks";
import { ACCOUNT_STATUS_BADGE_STYLES, ACCOUNT_STATUS_LABELS } from "../constants";
import type { BanType, TaskerAccountStatus } from "../types/admin-tasker.types";

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

  const banMutation = useBanTasker();
  const unbanMutation = useUnbanTasker();

  if (status !== "ACTIVE" && status !== "SUSPENDED") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "text-[10px] font-bold uppercase rounded-md border px-2 py-0.5",
          ACCOUNT_STATUS_BADGE_STYLES[status] || "bg-muted text-muted-foreground"
        )}
      >
        {ACCOUNT_STATUS_LABELS[status] || status}
      </Badge>
    );
  }

  const isActive = status === "ACTIVE";

  const handleToggleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isActive) {
      setReason("");
      setBanType("TEMPORARY");
      setBanOpen(true);
    } else {
      setUnbanOpen(true);
    }
  };

  const handleBan = () => {
    if (!reason.trim()) return;
    banMutation.mutate(
      { id: taskerId, reason: reason.trim(), type: banType },
      { onSuccess: () => setBanOpen(false) }
    );
  };

  const handleUnban = () => {
    unbanMutation.mutate(taskerId, { onSuccess: () => setUnbanOpen(false) });
  };

  return (
    <>
      <div className="flex items-center gap-2" onClick={handleToggleClick}>
        <Switch
          checked={isActive}
          disabled={banMutation.isPending || unbanMutation.isPending}
          className="data-[state=checked]:bg-emerald-500"
        />
        <span
          className={cn(
            "text-xs font-semibold",
            isActive ? "text-emerald-600" : "text-orange-600"
          )}
        >
          {isActive ? "Đang hoạt động" : "Bị đình chỉ"}
        </span>
      </div>

      <Dialog open={banOpen} onOpenChange={setBanOpen}>
        <DialogContent className="sm:max-w-md rounded-[20px]">
          <DialogHeader>
            <DialogTitle>Đình chỉ / Khóa tài khoản tasker</DialogTitle>
            <DialogDescription className="pt-1 text-sm text-muted-foreground">
              Bạn đang khóa tài khoản của <strong>{fullName}</strong>. Chọn hình thức và
              nêu rõ lý do.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Hình thức</Label>
              <Select value={banType} onValueChange={(v) => setBanType(v as BanType)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Chọn hình thức" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="TEMPORARY">Đình chỉ tạm thời</SelectItem>
                  <SelectItem value="PERMANENT">Khóa vĩnh viễn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lý do</Label>
              <Textarea
                placeholder="Nhập lý do cụ thể..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[100px] rounded-xl resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setBanOpen(false)}
              disabled={banMutation.isPending}
              className="rounded-full"
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
        <DialogContent className="sm:max-w-md rounded-[20px]">
          <DialogHeader>
            <DialogTitle>Gỡ khóa tài khoản tasker</DialogTitle>
            <DialogDescription className="pt-1 text-sm text-muted-foreground">
              Khôi phục hoạt động cho <strong>{fullName}</strong>? Tasker sẽ được nhận việc
              trở lại.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setUnbanOpen(false)}
              disabled={unbanMutation.isPending}
              className="rounded-full"
            >
              Hủy
            </Button>
            <Button
              onClick={handleUnban}
              disabled={unbanMutation.isPending}
              className="rounded-full"
            >
              {unbanMutation.isPending ? "Đang xử lý..." : "Gỡ khóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
