"use client";

import * as React from "react";
import Link from "next/link";
import { KeyRound, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useAuth, useLogout } from "@/features/auth/hooks/auth.hooks";
import { ROUTES } from "@/constants/routes";
import { getInitials } from "@/lib/format";
import { AdminAvatar } from "@/components/admin/ui/AdminAvatar";

export interface AdminUser {
  fullName: string;
  email: string;
  avatar?: string | null;
  initials: string;
}

/** Resolve the current admin user from the auth query (with a safe fallback). */
export function useAdminUser(): { user: AdminUser | null; isLoading: boolean } {
  const { data, isLoading } = useAuth();
  if (isLoading) return { user: null, isLoading: true };
  if (!data) return { user: null, isLoading: false };
  const fullName = data.fullName || "Quản trị viên";
  return {
    user: {
      fullName,
      email: data.email || "",
      avatar: data.avatar ?? data.avatarUrl ?? null,
      initials: getInitials(fullName),
    },
    isLoading: false,
  };
}

/**
 * Shared user dropdown for the admin shell — header (avatar+name+email),
 * change-password link, and a confirm-logout action. The `trigger` is supplied
 * by the caller (sidebar footer button or topbar avatar).
 */
export function AdminUserMenu({
  trigger,
  side = "right",
  align = "end",
}: {
  trigger: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}) {
  const { user } = useAdminUser();
  const logout = useLogout();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        className="cz-admin w-60 rounded-xl"
        side={side}
        align={align}
        sideOffset={8}
      >
        {user && (
          <>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2.5 px-2 py-2">
                <AdminAvatar initials={user.initials} src={user.avatar} size="md" />
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-[13px] font-semibold text-[var(--c-ink)]">
                    {user.fullName}
                  </div>
                  <div className="truncate text-[11.5px] text-[var(--c-muted)]">
                    {user.email}
                  </div>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild className="gap-2">
          <Link href={ROUTES.AUTH.FORGOT_PASSWORD}>
            <KeyRound className="size-4" />
            Đổi mật khẩu
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <ConfirmDialog
          trigger={
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              className="gap-2 text-[#E11D48] focus:text-[#E11D48]"
            >
              <LogOut className="size-4" />
              Đăng xuất
            </DropdownMenuItem>
          }
          title="Xác nhận đăng xuất"
          description="Bạn có chắc chắn muốn đăng xuất?"
          confirmText="Đăng xuất"
          cancelText="Huỷ"
          onConfirm={() => logout.mutate()}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
