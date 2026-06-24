"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Loader2, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Profile } from "@/features/auth/types/user.type";
import { useUpdateCustomerProfile } from "../hooks/useCustomerProfile";

interface CustomerProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
}

const PHONE_PATTERN = /^0\d{9,10}$/;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg"];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

export function CustomerProfileDialog({
  open,
  onOpenChange,
  profile,
}: CustomerProfileDialogProps) {
  const updateProfile = useUpdateCustomerProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [avatar, setAvatar] = useState<File>();
  const [error, setError] = useState("");

  const previewUrl = useMemo(
    () => (avatar ? URL.createObjectURL(avatar) : undefined),
    [avatar],
  );

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const handleAvatarChange = (file?: File) => {
    setError("");
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError("Ảnh đại diện chỉ hỗ trợ JPG, JPEG hoặc PNG.");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setError("Ảnh đại diện không được vượt quá 5 MB.");
      return;
    }
    setAvatar(file);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = fullName.trim();
    const normalizedPhone = phone.trim();

    if (!normalizedName) {
      setError("Vui lòng nhập họ và tên.");
      return;
    }
    if (!PHONE_PATTERN.test(normalizedPhone)) {
      setError("Số điện thoại phải bắt đầu bằng 0 và có 10–11 chữ số.");
      return;
    }

    setError("");
    updateProfile.mutate(
      {
        fullName: normalizedName,
        phone: normalizedPhone,
        avatar,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  const avatarSource =
    previewUrl ?? profile.avatar ?? profile.avatarUrl ?? undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-2xl p-0 sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle>Chỉnh sửa hồ sơ</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin liên hệ và ảnh đại diện của bạn.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 py-5">
            <div className="flex items-center gap-4">
              <Avatar className="size-20 border-2 border-primary/20">
                <AvatarImage src={avatarSource} alt={fullName} />
                <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                  {fullName.trim().slice(0, 2).toUpperCase() || (
                    <UserRound className="size-6" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  className="hidden"
                  onChange={(event) =>
                    handleAvatarChange(event.target.files?.[0])
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 rounded-xl"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="size-4" />
                  Chọn ảnh
                </Button>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  JPG hoặc PNG, tối đa 5 MB
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-full-name">Họ và tên</Label>
              <Input
                id="customer-full-name"
                value={fullName}
                maxLength={100}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Nhập họ và tên"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-phone">Số điện thoại</Label>
              <Input
                id="customer-phone"
                type="tel"
                inputMode="numeric"
                value={phone}
                maxLength={11}
                onChange={(event) =>
                  setPhone(event.target.value.replace(/\D/g, ""))
                }
                placeholder="Ví dụ: 0901234567"
              />
              <p className="text-xs text-muted-foreground">
                Số điện thoại là bắt buộc để đặt dịch vụ.
              </p>
            </div>

            {error && (
              <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={updateProfile.isPending}
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="rounded-xl"
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
