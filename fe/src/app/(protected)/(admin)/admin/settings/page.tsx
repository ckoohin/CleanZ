"use client"

import * as React from "react"
import { Save } from "lucide-react"

import { BaseButton } from "@/components/ui/base/base_button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Cấu hình Hệ thống
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Thiết lập các tham số cốt lõi cho nền tảng CleanZ.
          </p>
        </div>
        <BaseButton variant="primary" className="rounded-xl shadow-lg shadow-primary/20 gap-2 h-11 px-6">
          <Save className="w-4 h-4" />
          <span className="font-bold uppercase tracking-widest text-[10px]">Lưu thay đổi</span>
        </BaseButton>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Chiết khấu & Phí */}
        <Card className="border-border/40 bg-card/40 backdrop-blur-sm shadow-xl shadow-primary/5 rounded-[2rem]">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-foreground">Hoa hồng & Chi phí</CardTitle>
            <CardDescription>Thiết lập các khoản phí của nền tảng</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Hoa hồng nền tảng (Platform Commission Rate)</Label>
              <div className="flex items-center gap-2">
                <Input type="number" defaultValue={20} className="rounded-xl bg-card" />
                <span className="font-bold text-muted-foreground">%</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Phần trăm chiết khấu từ tổng thu nhập của Tasker.</p>
            </div>
            
            <Separator className="my-4 opacity-50" />

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Tiền cọc tối thiểu (Min Deposit)</Label>
              <div className="flex items-center gap-2">
                <Input type="number" defaultValue={400000} className="rounded-xl bg-card" />
                <span className="font-bold text-muted-foreground">VNĐ</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Số tiền cọc tối thiểu để Tasker có thể nhận việc.</p>
            </div>
          </CardContent>
        </Card>

        {/* Phí Hủy Đơn */}
        <Card className="border-border/40 bg-card/40 backdrop-blur-sm shadow-xl shadow-primary/5 rounded-[2rem]">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-foreground">Phí hủy đơn hàng (Cancellation)</CardTitle>
            <CardDescription>Các mốc phạt khi khách hàng hủy đơn</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">{">"} 4 giờ trước ca làm</Label>
              <div className="flex items-center gap-2">
                <Input type="number" defaultValue={0} className="rounded-xl bg-card" />
                <span className="font-bold text-muted-foreground">%</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">1 - 4 giờ trước ca làm</Label>
              <div className="flex items-center gap-2">
                <Input type="number" defaultValue={30} className="rounded-xl bg-card" />
                <span className="font-bold text-muted-foreground">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">{"<"} 1 giờ hoặc sau khi bắt đầu</Label>
              <div className="flex items-center gap-2">
                <Input type="number" defaultValue={50} className="rounded-xl bg-card" />
                <span className="font-bold text-muted-foreground">%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
