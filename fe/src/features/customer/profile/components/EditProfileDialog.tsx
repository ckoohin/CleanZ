import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateProfile } from "@/features/auth/hooks/auth.hooks";
import type { Profile } from "@/features/auth/types/user.type";
import { Phone, User, Loader2 } from "lucide-react";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
}

export const EditProfileDialog: React.FC<EditProfileDialogProps> = ({ open, onOpenChange, profile }) => {
  const updateMutation = useUpdateProfile();
  const [fullName, setFullName] = useState(profile.fullName || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>({});

  const [prevProfile, setPrevProfile] = useState(profile);
  const [prevOpen, setPrevOpen] = useState(open);

  if (profile !== prevProfile || open !== prevOpen) {
    setPrevProfile(profile);
    setPrevOpen(open);
    if (open) {
      setFullName(profile.fullName || "");
      setPhone(profile.phone || "");
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
      newErrors.phone = "Số điện thoại phải bắt đầu bằng 0 và có 10-11 chữ số";
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
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-3xl border-border bg-card p-6 shadow-xl">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-xl font-bold text-foreground tracking-tight">Chỉnh sửa hồ sơ</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cập nhật thông tin cá nhân của bạn. Số điện thoại là bắt buộc để đặt lịch dịch vụ.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Họ tên */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" />
              Họ và tên
            </label>
            <Input
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
              }}
              placeholder="Nhập họ và tên..."
              className="h-11 rounded-xl bg-background border-border/50 focus-visible:ring-primary/20"
            />
            {errors.fullName && <p className="text-[10px] font-bold text-destructive">{errors.fullName}</p>}
          </div>

          {/* Số điện thoại */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-primary" />
              Số điện thoại
            </label>
            <Input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              placeholder="Nhập số điện thoại (ví dụ: 0987654321)..."
              className="h-11 rounded-xl bg-background border-border/50 focus-visible:ring-primary/20"
            />
            {errors.phone && <p className="text-[10px] font-bold text-destructive">{errors.phone}</p>}
          </div>

          <DialogFooter className="pt-4 border-t border-border/30 gap-2 flex sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-xl font-bold text-xs"
              disabled={updateMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="h-10 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:opacity-90"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <div className="flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </div>
              ) : (
                "Lưu thay đổi"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
