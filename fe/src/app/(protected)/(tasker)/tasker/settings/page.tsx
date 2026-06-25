"use client";

import React, { useState } from "react";
import { useThemeToggleContext } from "@/contexts/themeToggle.context";
import { Sun, Moon, Paintbrush, Bell, Shield, LogOut, AlertTriangle, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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

export default function TaskerSettingsPage() {
  const { theme, toggleTheme } = useThemeToggleContext();
  const { data: tasker } = useTaskerProfile();
  const logout = useLogout();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const initials = tasker?.fullName
    ? tasker.fullName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "S";

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6 px-4 md:px-6 py-6 pb-32 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Cài đặt</h1>
        <p className="text-muted-foreground">
          Tùy chỉnh giao diện, thông báo và các tùy chọn bảo mật tài khoản của bạn.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paintbrush className="w-5 h-5 text-primary" />
              Giao diện (Theme)
            </CardTitle>
            <CardDescription>
              Tùy chỉnh cách CleanZ hiển thị trên thiết bị của bạn.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base">Chế độ Sáng / Tối</Label>
                <p className="text-sm text-muted-foreground">
                  Chuyển đổi giao diện để bảo vệ mắt khi làm việc ban đêm.
                </p>
              </div>
              <Button
                variant="outline"
                size="lg"
                onClick={toggleTheme}
                className="relative overflow-hidden rounded-xl border-primary/20 hover:border-primary/50"
              >
                <div className="flex items-center gap-2">
                  {theme === "dark" ? (
                    <>
                      <Moon className="w-5 h-5 text-indigo-400" />
                      <span>Chế độ Tối</span>
                    </>
                  ) : (
                    <>
                      <Sun className="w-5 h-5 text-amber-500" />
                      <span>Chế độ Sáng</span>
                    </>
                  )}
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Thông báo
            </CardTitle>
            <CardDescription>
              Kiểm soát các loại thông báo bạn muốn nhận.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base">Thông báo công việc mới</Label>
                <p className="text-sm text-muted-foreground">
                  Nhận thông báo đẩy (Push notification) khi có công việc mới phù hợp.
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base">Email tóm tắt tuần</Label>
                <p className="text-sm text-muted-foreground">
                  Gửi email tóm tắt thu nhập và số đơn hàng hoàn thành mỗi cuối tuần.
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Security Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Bảo mật
            </CardTitle>
            <CardDescription>
              Quản lý mật khẩu và các thiết bị đăng nhập.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base">Mật khẩu</Label>
                <p className="text-sm text-muted-foreground">
                  Cập nhật lần cuối: 2 tháng trước
                </p>
              </div>
              <Button variant="outline">Đổi mật khẩu</Button>
            </div>
          </CardContent>
        </Card>

        {/* ─── Tài khoản & Đăng xuất ─────────────────────────────── */}
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Tài khoản
            </CardTitle>
            <CardDescription>
              Quản lý phiên đăng nhập và thông tin tài khoản của bạn.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Profile preview */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/40 border border-border/50">
              <Avatar className="w-12 h-12 shrink-0">
                <AvatarImage src={tasker?.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground truncate">{tasker?.fullName ?? "Đối tác CleanZ"}</p>
                <p className="text-sm text-muted-foreground truncate">{tasker?.phone ?? "Chưa cập nhật SĐT"}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  tasker?.presenceStatus === "ONLINE"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {tasker?.presenceStatus === "ONLINE" ? "● Đang hoạt động" : "● Không hoạt động"}
                </span>
              </div>
            </div>

            <Separator />

            {/* Logout button */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-semibold text-destructive">Đăng xuất</Label>
                <p className="text-sm text-muted-foreground">
                  Kết thúc phiên làm việc hiện tại và quay về trang đăng nhập.
                </p>
              </div>
              <Button
                variant="destructive"
                className="gap-2 rounded-xl font-bold shadow-md shadow-destructive/20 hover:shadow-destructive/30 transition-all"
                onClick={() => setShowLogoutDialog(true)}
                disabled={logout.isPending}
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                {logout.isPending ? "Đang đăng xuất..." : "Đăng xuất"}
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>

    {/* Confirm Logout Dialog */}
    <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-xl font-bold">
            <AlertTriangle className="w-6 h-6 text-amber-500" aria-hidden="true" />
            Xác nhận đăng xuất?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Bạn sẽ được chuyển về trang đăng nhập. Mọi dữ liệu chưa lưu sẽ bị mất.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 gap-2">
          <AlertDialogCancel className="h-11 rounded-xl font-bold">Hủy bỏ</AlertDialogCancel>
          <AlertDialogAction
            className="h-11 rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            {logout.isPending ? "Đang đăng xuất..." : "Đăng xuất ngay"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
