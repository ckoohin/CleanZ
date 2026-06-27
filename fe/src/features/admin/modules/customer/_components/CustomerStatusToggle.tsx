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
import { useToggleCustomerStatus } from "@/features/admin/modules/customer/hooks/useAdminCustomer";

interface CustomerStatusToggleProps {
  customerId: string;
  isActive: boolean;
  fullName: string;
}

export const CustomerStatusToggle: React.FC<CustomerStatusToggleProps> = ({
  customerId,
  isActive,
  fullName,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const toggleMutation = useToggleCustomerStatus();

  const handleToggleClick = (e: React.MouseEvent) => {
    // Prevent default switch behavior until confirmed
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    toggleMutation.mutate(
      { id: customerId, isActive: !isActive },
      {
        onSuccess: () => {
          setShowConfirm(false);
        },
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
              {isActive ? "Khóa tài khoản khách hàng" : "Mở khóa tài khoản khách hàng"}
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-muted-foreground">
              {isActive ? (
                <span>
                  Bạn có chắc chắn muốn <strong>khóa</strong> tài khoản của khách hàng{" "}
                  <strong>{fullName}</strong>? Khách hàng này sẽ không thể đăng nhập hoặc đặt lịch dịch vụ mới.
                </span>
              ) : (
                <span>
                  Bạn có chắc chắn muốn <strong>mở khóa</strong> tài khoản của khách hàng{" "}
                  <strong>{fullName}</strong>? Khách hàng này sẽ được khôi phục quyền đăng nhập và đặt dịch vụ.
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
