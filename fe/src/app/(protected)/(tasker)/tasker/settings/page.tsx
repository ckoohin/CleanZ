"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useThemeToggleContext } from "@/contexts/themeToggle.context";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  LogOut,
  Mail,
  Moon,
  Paintbrush,
  Shield,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useLogout } from "@/features/auth/hooks/auth.hooks";
import { useTaskerProfile } from "@/features/tasker/hooks/tasker.hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

/** Section card cùng ngôn ngữ với menu Tài khoản (TaskerAccountOverview). */
function SettingSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </h2>
      <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        {children}
      </div>
    </section>
  );
}

function SettingRow({
  icon: Icon,
  title,
  description,
  destructive = false,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  destructive?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-16 w-full items-center gap-3 px-4 py-3">
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl",
          destructive
            ? "bg-destructive/10 text-destructive"
            : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-sm font-bold",
            destructive ? "text-destructive" : "text-foreground",
          )}
        >
          {title}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
      {children && <span className="shrink-0">{children}</span>}
    </div>
  );
}

export default function TaskerSettingsPage() {
  const { theme, toggleTheme } = useThemeToggleContext();
  const { data: tasker } = useTaskerProfile();
  const logout = useLogout();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const initials = tasker?.fullName
    ? tasker.fullName
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "CZ";

  return (
    <>
      <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-5 pb-32 md:px-6 md:py-8">
        <div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="mb-4 -ml-2 text-muted-foreground"
          >
            <Link href="/tasker/profile">
              <ArrowLeft className="size-4" aria-hidden="true" /> Quay lại Tài
              khoản
            </Link>
          </Button>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Cài đặt
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tùy chỉnh giao diện, thông báo và bảo mật tài khoản của bạn.
          </p>
        </div>

        {/* Profile preview */}
        <section className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <Avatar className="size-12 shrink-0">
            <AvatarImage src={tasker?.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-primary/10 font-bold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-foreground">
              {tasker?.fullName ?? "Đối tác CleanZ"}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {tasker?.phone ?? "Chưa cập nhật số điện thoại"}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide",
              tasker?.presenceStatus === "ONLINE"
                ? "bg-emerald-500/10 text-emerald-700"
                : "bg-muted text-muted-foreground",
            )}
          >
            {tasker?.presenceStatus === "ONLINE"
              ? "Đang hoạt động"
              : "Không hoạt động"}
          </span>
        </section>

        <SettingSection title="Giao diện">
          <SettingRow
            icon={Paintbrush}
            title="Chế độ Sáng / Tối"
            description=""
          >
            <Button
              variant="outline"
              onClick={toggleTheme}
              className="gap-2 rounded-xl"
            >
              {theme === "dark" ? (
                <>
                  <Moon className="size-4 text-indigo-400" aria-hidden="true" />
                  Chế độ Tối
                </>
              ) : (
                <>
                  <Sun className="size-4 text-amber-500" aria-hidden="true" />
                  Chế độ Sáng
                </>
              )}
            </Button>
          </SettingRow>
        </SettingSection>

        <SettingSection title="Thông báo">
          <SettingRow
            icon={Bell}
            title="Thông báo công việc mới"
            description="Nhận thông báo đẩy khi có công việc mới phù hợp."
          >
            <Switch defaultChecked />
          </SettingRow>
          <SettingRow
            icon={Mail}
            title="Email tóm tắt tuần"
            description="Gửi email tóm tắt thu nhập và số đơn hoàn thành mỗi cuối tuần."
          >
            <Switch />
          </SettingRow>
        </SettingSection>

        <SettingSection title="Bảo mật">
          <SettingRow
            icon={Shield}
            title="Mật khẩu"
            description="Đổi mật khẩu định kỳ để bảo vệ tài khoản."
          >
            <Button variant="outline" className="rounded-xl">
              Đổi mật khẩu
            </Button>
          </SettingRow>
        </SettingSection>

        <SettingSection title="Phiên đăng nhập">
          <SettingRow
            icon={LogOut}
            title="Đăng xuất"
            description="Kết thúc phiên làm việc hiện tại trên thiết bị này."
            destructive
          >
            <Button
              variant="destructive"
              className="gap-2 rounded-xl font-bold"
              onClick={() => setShowLogoutDialog(true)}
              disabled={logout.isPending}
            >
              <LogOut className="size-4" aria-hidden="true" />
              {logout.isPending ? "Đang đăng xuất..." : "Đăng xuất"}
            </Button>
          </SettingRow>
        </SettingSection>
      </div>

      {/* Confirm Logout Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle
                className="size-5 text-amber-500"
                aria-hidden="true"
              />
              Xác nhận đăng xuất?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bạn sẽ kết thúc phiên làm việc hiện tại và quay về trang đăng nhập
              Tasker.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Ở lại</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {logout.isPending ? "Đang đăng xuất..." : "Đăng xuất"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
