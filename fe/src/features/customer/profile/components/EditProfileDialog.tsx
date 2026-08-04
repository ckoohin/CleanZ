import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateProfile } from "@/features/auth/hooks/auth.hooks";
import type { Profile } from "@/features/auth/types/user.type";
import { Phone, User, Loader2, CheckCircle2 } from "lucide-react";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: Profile | null;
  onSuccess?: () => void;
}

export const EditProfileDialog: React.FC<EditProfileDialogProps> = ({
  open,
  onOpenChange,
  profile,
  onSuccess,
}) => {
  const updateMutation = useUpdateProfile();
  const [fullName, setFullName] = useState(profile?.fullName || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>({});

  const [prevProfile, setPrevProfile] = useState(profile);
  const [prevOpen, setPrevOpen] = useState(open);

  if (profile !== prevProfile || open !== prevOpen) {
    setPrevProfile(profile);
    setPrevOpen(open);
    if (open) {
      setFullName(profile?.fullName || "");
      setPhone(profile?.phone || "");
      setErrors({});
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { fullName?: string; phone?: string } = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Họ và tên không được để trống";
    }
    if (!phone.trim()) {
      newErrors.phone = "Số điện thoại không được để trống";
    } else if (!/^0\d{9,10}$/.test(phone.trim())) {
      newErrors.phone = "Số điện thoại phải bắt đầu bằng 0 và gồm 10-11 chữ số";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    updateMutation.mutate(
      { fullName: fullName.trim(), phone: phone.trim() },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess?.();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-3xl border-border bg-card p-6 shadow-xl z-[100000]">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Cập nhật thông tin cá nhân
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Vui lòng bổ sung họ tên và số điện thoại liên hệ để nhân viên Tasker có thể gọi điện xác nhận dịch vụ.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Họ tên */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground/80 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" />
              Họ và tên <span className="text-destructive">*</span>
            </label>
            <Input
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
              }}
              placeholder="Nhập họ và tên của bạn..."
              className="h-11 rounded-xl bg-background border-border/50 focus-visible:ring-primary/20 text-sm font-semibold"
            />
            {errors.fullName && <p className="text-[11px] font-bold text-destructive">{errors.fullName}</p>}
          </div>

          {/* Số điện thoại */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground/80 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-primary" />
              Số điện thoại liên hệ <span className="text-destructive">*</span>
            </label>
            <Input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              placeholder="Nhập số điện thoại (ví dụ: 0987654321)..."
              className="h-11 rounded-xl bg-background border-border/50 focus-visible:ring-primary/20 text-sm font-semibold"
            />
            {errors.phone && <p className="text-[11px] font-bold text-destructive">{errors.phone}</p>}
          </div>

          <DialogFooter className="pt-4 border-t border-border/30 gap-2 flex sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 px-5 rounded-xl font-bold text-xs"
              disabled={updateMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="h-11 px-6 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:opacity-90 shadow-md shadow-primary/20 active:scale-95 transition-all"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang cập nhật...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Lưu & Xử lý tiếp</span>
                </div>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
