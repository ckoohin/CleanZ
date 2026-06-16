"use client";

import React from "react";
import { useThemeToggleContext } from "@/contexts/themeToggle.context";
import { Sun, Moon, Monitor, Paintbrush, Bell, Shield, Languages } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

export default function TaskerSettingsPage() {
  const { theme, toggleTheme } = useThemeToggleContext();

  return (
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

      </div>
    </div>
  );
}
