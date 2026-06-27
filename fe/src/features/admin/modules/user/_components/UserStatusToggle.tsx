"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusSwitch } from "@/components/ui/base/status_switch";
import { useToggleUserStatus } from "../hooks/useAdminUser";

interface UserStatusToggleProps {
  userId: string;
  isActive: boolean;
  fullName: string;
}

export const UserStatusToggle: React.FC<UserStatusToggleProps> = ({
  userId,
  isActive,
  fullName,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const toggleMutation = useToggleUserStatus();

  const handleToggleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    toggleMutation.mutate(
      { id: userId, isActive: !isActive },
      {
        onSuccess: () => setShowConfirm(false),
      }
    );
  };

  return (
    <>
      <StatusSwitch
        checked={isActive}
        disabled={toggleMutation.isPending}
        onClick={handleToggleClick}
        ariaLabel={`${isActive ? "Khóa" : "Mở khóa"} tài khoản ${fullName}`}
        activeLabel="Đang hoạt động"
        inactiveLabel="Bị khóa"
      />

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md rounded-[20px]">
          <DialogHeader>
            <DialogTitle>
              {isActive ? "Khóa tài khoản người dùng" : "Mở khóa tài khoản người dùng"}
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-muted-foreground">
              {isActive ? (
                <span>
                  Bạn có chắc chắn muốn <strong>khóa</strong> tài khoản của{" "}
                  <strong>{fullName}</strong>? Người dùng này sẽ không thể đăng nhập vào hệ thống.
                </span>
              ) : (
                <span>
                  Bạn có chắc chắn muốn <strong>mở khóa</strong> tài khoản của{" "}
                  <strong>{fullName}</strong>? Người dùng này sẽ được khôi phục quyền đăng nhập.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={toggleMutation.isPending}
              className="rounded-full"
            >
              Hủy
            </Button>
            <Button
              variant={isActive ? "destructive" : "default"}
              onClick={handleConfirm}
              disabled={toggleMutation.isPending}
              className="rounded-full"
            >
              {toggleMutation.isPending ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
