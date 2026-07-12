"use client"

import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Save,
  Wallet,
  Banknote,
  Settings2,
  CalendarClock, 
  Users, 
  ShieldAlert,
  Loader2,
  Percent,
  Clock,
  MapPin,
  Star,
  Mail,
  Phone
} from "lucide-react"

import { BaseButton } from "@/components/ui/base/base_button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { toast } from "sonner"
import { SystemConfigGroupCard } from "@/features/admin/modules/system-config/_components/SystemConfigGroupCard"

// Giả lập Schema cấu hình hệ thống
const settingsSchema = z.object({
  // Tab 1: Tài chính
  platformCommissionRate: z.number().min(0).max(100),
  minDeposit: z.number().min(0),
  vatRate: z.number().min(0).max(100),
  allowCashPayment: z.boolean(),
  
  // Tab 2: Vận hành
  minAdvanceBookingHours: z.number().min(1),
  cancelPenaltyOver4h: z.number().min(0).max(100),
  cancelPenalty1to4h: z.number().min(0).max(100),
  cancelPenaltyUnder1h: z.number().min(0).max(100),
  
  // Tab 3: Tasker
  maxMatchingRadiusKm: z.number().min(1),
  minRatingThreshold: z.number().min(1).max(5),
  autoBlockCancelCount: z.number().min(1),
  
  // Tab 4: Hệ thống
  supportPhone: z.string(),
  supportEmail: z.string().email(),
  maintenanceMode: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function AdminSettingsPage() {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      platformCommissionRate: 20,
      minDeposit: 400000,
      vatRate: 8,
      allowCashPayment: true,
      
      minAdvanceBookingHours: 2,
      cancelPenaltyOver4h: 0,
      cancelPenalty1to4h: 30,
      cancelPenaltyUnder1h: 50,
      
      maxMatchingRadiusKm: 10,
      minRatingThreshold: 3.5,
      autoBlockCancelCount: 3,
      
      supportPhone: "1900 1234",
      supportEmail: "support@cleanz.vn",
      maintenanceMode: false,
    },
  });

  const onSubmit = async (values: SettingsFormValues) => {
    setIsSaving(true);
    // Giả lập API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log("Saved Configs:", values);
    toast.success("Đã lưu cấu hình hệ thống thành công!");
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500 max-w-[1200px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--c-ink)] flex items-center gap-3">
            <Settings2 className="w-8 h-8 text-[var(--c-primary-strong)]" />
            Cấu hình Hệ thống
          </h1>
          <p className="text-[var(--c-muted)] text-sm mt-1">
            Thiết lập các tham số cốt lõi cho mọi hoạt động của nền tảng CleanZ.
          </p>
        </div>
        <BaseButton 
          variant="primary" 
          onClick={form.handleSubmit(onSubmit)}
          disabled={isSaving}
          className="rounded-xl shadow-lg shadow-primary/20 gap-2 h-11 px-6"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span className="font-bold uppercase tracking-widest text-[10px]">Lưu thay đổi</span>
        </BaseButton>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
          <Tabs defaultValue="finance" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1 bg-[var(--c-card-2)] rounded-2xl mb-6 border border-[var(--c-line)]">
              <TabsTrigger value="finance" className="py-3 rounded-xl font-bold gap-2 data-[state=active]:bg-[var(--c-card)] data-[state=active]:shadow-sm data-[state=active]:text-[var(--c-primary-strong)] transition-all">
                <Wallet className="w-4 h-4" />
                <span className="hidden sm:inline">Tài chính</span>
              </TabsTrigger>
              <TabsTrigger value="operations" className="py-3 rounded-xl font-bold gap-2 data-[state=active]:bg-[var(--c-card)] data-[state=active]:shadow-sm data-[state=active]:text-[var(--c-primary-strong)] transition-all">
                <CalendarClock className="w-4 h-4" />
                <span className="hidden sm:inline">Vận hành</span>
              </TabsTrigger>
              <TabsTrigger value="taskers" className="py-3 rounded-xl font-bold gap-2 data-[state=active]:bg-[var(--c-card)] data-[state=active]:shadow-sm data-[state=active]:text-[var(--c-primary-strong)] transition-all">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Đối tác</span>
              </TabsTrigger>
              <TabsTrigger value="system" className="py-3 rounded-xl font-bold gap-2 data-[state=active]:bg-[var(--c-card)] data-[state=active]:shadow-sm data-[state=active]:text-[var(--c-primary-strong)] transition-all">
                <ShieldAlert className="w-4 h-4" />
                <span className="hidden sm:inline">Hệ thống</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB TÀI CHÍNH */}
            <TabsContent value="finance" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-[var(--c-line)] bg-[var(--c-card)] backdrop-blur-sm shadow-xl shadow-primary/5 rounded-[2rem] overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      Chiết khấu & Thuế
                    </CardTitle>
                    <CardDescription>Thiết lập tỉ lệ ăn chia và thuế giá trị gia tăng</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="platformCommissionRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-[var(--c-muted)] tracking-wider">Hoa hồng nền tảng (%)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} className="pl-10 rounded-xl bg-[var(--c-card-2)] border-[var(--c-line-strong)]" />
                              <Percent className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)]" />
                            </div>
                          </FormControl>
                          <FormDescription className="text-[10px]">Phần trăm chiết khấu từ tổng thu nhập của Tasker.</FormDescription>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="vatRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-[var(--c-muted)] tracking-wider">Thuế VAT (%)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} className="pl-10 rounded-xl bg-[var(--c-card-2)] border-[var(--c-line-strong)]" />
                              <Percent className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)]" />
                            </div>
                          </FormControl>
                          <FormDescription className="text-[10px]">Thuế suất áp dụng cho hóa đơn xuất ra.</FormDescription>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card className="border-[var(--c-line)] bg-[var(--c-card)] backdrop-blur-sm shadow-xl shadow-primary/5 rounded-[2rem] overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      Giao dịch & Thanh toán
                    </CardTitle>
                    <CardDescription>Quy định dòng tiền trong hệ thống</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="minDeposit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-[var(--c-muted)] tracking-wider">Tiền cọc tối thiểu (VNĐ)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} className="pl-10 rounded-xl bg-[var(--c-card-2)] border-[var(--c-line-strong)] font-mono text-[var(--c-primary-strong)]" />
                              <Wallet className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)]" />
                            </div>
                          </FormControl>
                          <FormDescription className="text-[10px]">Số dư ví tối thiểu để Tasker có thể nhận việc mới.</FormDescription>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="allowCashPayment"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-xl border border-[var(--c-line)] p-4 shadow-sm bg-[var(--c-card-2)]">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-bold text-[var(--c-ink)]">
                              Cho phép trả tiền mặt
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Cho phép khách hàng thanh toán trực tiếp cho Tasker.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <SystemConfigGroupCard
                  group="TOPUP"
                  description="Tỷ giá quy đổi PayPal và hạn mức mỗi đơn nạp của khách hàng."
                  icon={<Wallet className="w-5 h-5 text-[var(--c-primary-strong)]" />}
                />

                <SystemConfigGroupCard
                  group="WITHDRAWAL"
                  description="Hạn mức và tần suất rút tiền, áp dụng cho cả Tasker và Khách hàng."
                  icon={<Banknote className="w-5 h-5 text-[var(--c-primary-strong)]" />}
                />
              </div>
            </TabsContent>

            {/* TAB VẬN HÀNH */}
            <TabsContent value="operations" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-[var(--c-line)] bg-[var(--c-card)] backdrop-blur-sm shadow-xl shadow-primary/5 rounded-[2rem] overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      Phí hủy đơn hàng (Khách)
                    </CardTitle>
                    <CardDescription>Tỉ lệ phạt dựa trên thời điểm hủy</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="cancelPenaltyOver4h"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-[var(--c-muted)] tracking-wider">{">"} 4 giờ trước ca làm (%)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} className="pl-10 rounded-xl bg-[var(--c-card-2)] border-[var(--c-line-strong)]" />
                              <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)]" />
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cancelPenalty1to4h"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-[var(--c-muted)] tracking-wider">Từ 1 - 4 giờ trước ca làm (%)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} className="pl-10 rounded-xl bg-[var(--c-card-2)] border-[var(--c-line-strong)]" />
                              <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)]" />
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cancelPenaltyUnder1h"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-[var(--c-muted)] tracking-wider">{"<"} 1 giờ hoặc sau bắt đầu (%)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} className="pl-10 rounded-xl bg-[var(--c-card-2)] border-[var(--c-line-strong)]" />
                              <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)]" />
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card className="border-[var(--c-line)] bg-[var(--c-card)] backdrop-blur-sm shadow-xl shadow-primary/5 rounded-[2rem] overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      Quy tắc Đặt lịch
                    </CardTitle>
                    <CardDescription>Tham số tính toán cho việc đặt chỗ</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="minAdvanceBookingHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-[var(--c-muted)] tracking-wider">Thời gian đặt trước tối thiểu (Giờ)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} className="pl-10 rounded-xl bg-[var(--c-card-2)] border-[var(--c-line-strong)]" />
                              <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)]" />
                            </div>
                          </FormControl>
                          <FormDescription className="text-[10px]">Khách hàng phải đặt trước ít nhất bao nhiêu giờ.</FormDescription>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* TAB TASKER */}
            <TabsContent value="taskers" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
              <div className="grid gap-6 md:grid-cols-2">
                <SystemConfigGroupCard
                  group="TASKER"
                  description="Sàn số dư ví Tasker phải giữ để được nhận đơn, và không được rút xuống dưới mức này."
                  icon={<Wallet className="w-5 h-5 text-[var(--c-primary-strong)]" />}
                />

                <Card className="border-[var(--c-line)] bg-[var(--c-card)] backdrop-blur-sm shadow-xl shadow-primary/5 rounded-[2rem] overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      Điều kiện Nhận việc
                    </CardTitle>
                    <CardDescription>Cấu hình ưu tiên và chặn Tasker</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="maxMatchingRadiusKm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-[var(--c-muted)] tracking-wider">Bán kính quét việc (KM)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} className="pl-10 rounded-xl bg-[var(--c-card-2)] border-[var(--c-line-strong)]" />
                              <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)]" />
                            </div>
                          </FormControl>
                          <FormDescription className="text-[10px]">Khoảng cách tối đa để hệ thống đề xuất việc cho Tasker.</FormDescription>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="minRatingThreshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-[var(--c-muted)] tracking-wider">Đánh giá tối thiểu (Sao)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" step="0.1" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} className="pl-10 rounded-xl bg-[var(--c-card-2)] border-[var(--c-line-strong)]" />
                              <Star className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)]" />
                            </div>
                          </FormControl>
                          <FormDescription className="text-[10px]">Dưới mức này Tasker sẽ bị cấm nhận việc mới.</FormDescription>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="autoBlockCancelCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-[var(--c-muted)] tracking-wider">Giới hạn Hủy đơn (Lần/tháng)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} className="pl-10 rounded-xl bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[#E11D48] font-bold" />
                              <ShieldAlert className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)]" />
                            </div>
                          </FormControl>
                          <FormDescription className="text-[10px]">Tự động khóa tài khoản nếu hủy vượt quá số lần này.</FormDescription>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* TAB HỆ THỐNG */}
            <TabsContent value="system" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-[var(--c-line)] bg-[var(--c-card)] backdrop-blur-sm shadow-xl shadow-primary/5 rounded-[2rem] overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      Thông tin Liên hệ
                    </CardTitle>
                    <CardDescription>Hiển thị cho khách hàng khi cần trợ giúp</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="supportPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-[var(--c-muted)] tracking-wider">Hotline CSKH</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input {...field} className="pl-10 rounded-xl bg-[var(--c-card-2)] border-[var(--c-line-strong)]" />
                              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)]" />
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="supportEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-[var(--c-muted)] tracking-wider">Email hỗ trợ</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="email" {...field} className="pl-10 rounded-xl bg-[var(--c-card-2)] border-[var(--c-line-strong)]" />
                              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)]" />
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card className="border-[var(--c-line)] bg-[var(--c-card)] backdrop-blur-sm shadow-xl shadow-[rgba(225,29,72,0.12)] rounded-[2rem] overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold flex items-center gap-2 text-[#E11D48]">
                      Bảo trì Hệ thống
                    </CardTitle>
                    <CardDescription>Tạm dừng mọi hoạt động của nền tảng</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="maintenanceMode"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-xl border border-[#E11D48]/30 p-4 shadow-sm bg-[rgba(225,29,72,0.12)]">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-bold text-[#E11D48]">
                              Kích hoạt Bảo trì
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Hệ thống sẽ hiển thị trang bảo trì với tất cả người dùng (trừ Admin).
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  )
}
