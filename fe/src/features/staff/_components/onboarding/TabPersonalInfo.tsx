"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCircle, Phone, MapPin, Briefcase, Lightbulb, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/auth.hooks";
import { useApplyStaff, useUpdateStaffProfile, useStaffProfile } from "@/features/staff/hooks/staff.hooks";
import { toast } from "sonner";

// Mock services (cố định khi chưa có API)
const MOCK_SERVICES = [
  { id: "svc-1", name: "Dọn dẹp nhà theo giờ", category: "Vệ sinh", icon: "🏠" },
  { id: "svc-2", name: "Dọn dẹp văn phòng", category: "Vệ sinh", icon: "🏢" },
  { id: "svc-3", name: "Tổng vệ sinh nhà sau xây dựng", category: "Vệ sinh chuyên sâu", icon: "🔨" },
  { id: "svc-4", name: "Giặt sofa / thảm / rèm", category: "Vệ sinh chuyên sâu", icon: "🛋️" },
  { id: "svc-5", name: "Vệ sinh máy lạnh / điều hòa", category: "Thiết bị", icon: "❄️" },
  { id: "svc-6", name: "Vệ sinh tủ lạnh / máy giặt", category: "Thiết bị", icon: "🫙" },
];

const personalSchema = z.object({
  phone: z.string().min(9, "Số điện thoại không hợp lệ").max(11, "Số điện thoại không hợp lệ"),
  addressResident: z.string().min(10, "Vui lòng nhập địa chỉ thường trú đầy đủ"),
  addressCurrent: z.string().min(10, "Vui lòng nhập địa chỉ hiện tại đầy đủ"),
  experience: z.string().min(10, "Vui lòng mô tả kinh nghiệm của bạn (ít nhất 10 ký tự)"),
  bio: z.string().min(20, "Vui lòng giới thiệu bản thân (ít nhất 20 ký tự)"),
});

type PersonalValues = z.infer<typeof personalSchema>;

interface TabPersonalInfoProps {
  onBack: () => void;
  onNext: () => void;
}

export function TabPersonalInfo({ onBack, onNext }: TabPersonalInfoProps) {
  const { data: user } = useAuth();
  const { data: profile } = useStaffProfile();
  const [selectedServices, setSelectedServices] = React.useState<string[]>([]);
  const applyMutation = useApplyStaff();
  const updateProfileMutation = useUpdateStaffProfile();

  const form = useForm<PersonalValues>({
    resolver: zodResolver(personalSchema),
    defaultValues: {
      phone: profile?.phone ?? "",
      addressResident: profile?.addressResident ?? "",
      addressCurrent: profile?.addressCurrent ?? "",
      experience: profile?.experience ?? "",
      bio: profile?.bio ?? "",
    },
  });

  const toggleService = (id: string) => {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (values: PersonalValues) => {
    if (selectedServices.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 dịch vụ bạn có thể làm");
      return;
    }
    try {
      let profileId = profile?.id;
      if (!profileId && user?.id) {
        const newProfile = await applyMutation.mutateAsync(user.id);
        profileId = newProfile.id;
      }
      if (profileId) {
        await updateProfileMutation.mutateAsync({ id: profileId, data: values });
      }
      onNext();
    } catch {
      toast.error("Lỗi khi lưu thông tin, vui lòng thử lại");
    }
  };

  const isSubmitting = applyMutation.isPending || updateProfileMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Personal Info Card */}
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
          <CardHeader className="pt-10 px-10 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <UserCircle className="w-6 h-6 text-primary" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold font-serif text-primary">Thông tin cá nhân</CardTitle>
                <p className="text-muted-foreground text-sm mt-1">Thông tin này sẽ hiển thị trên hồ sơ đối tác của bạn</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-10 pb-10 space-y-6">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-bold flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" aria-hidden="true" /> Số điện thoại <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="0988xxxxxx" className="h-14 rounded-2xl bg-background/50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="addressResident"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-bold flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" aria-hidden="true" /> Địa chỉ thường trú <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP" className="h-14 rounded-2xl bg-background/50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="addressCurrent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-bold flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500" aria-hidden="true" /> Địa chỉ hiện tại <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Nơi bạn đang sinh sống (nếu khác)" className="h-14 rounded-2xl bg-background/50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="experience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-bold flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" aria-hidden="true" /> Kinh nghiệm <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ví dụ: Tôi có 2 năm kinh nghiệm làm vệ sinh gia đình tại TP.HCM..."
                      className="min-h-[100px] rounded-2xl bg-background/50 resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-bold flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-primary" aria-hidden="true" /> Giới thiệu bản thân <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Chia sẻ điểm mạnh, phong cách làm việc và những gì bạn cam kết với khách hàng..."
                      className="min-h-[120px] rounded-2xl bg-background/50 resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Service Selection Card */}
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
          <CardHeader className="pt-10 px-10 pb-6">
            <CardTitle className="text-2xl font-bold font-serif text-primary">Dịch vụ bạn có thể làm</CardTitle>
            <p className="text-muted-foreground text-sm">Chọn ít nhất 1 dịch vụ. Có thể thay đổi sau khi được duyệt.</p>
          </CardHeader>
          <CardContent className="px-10 pb-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {MOCK_SERVICES.map((service) => {
                const isSelected = selectedServices.includes(service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={`
                      relative p-5 rounded-2xl border-2 text-left transition-all duration-200 group
                      ${isSelected
                        ? "border-primary bg-primary/10 shadow-md"
                        : "border-border/50 bg-background/50 hover:border-primary/40"}
                    `}
                  >
                    <div className="text-3xl mb-3">{service.icon}</div>
                    <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">{service.category}</p>
                    <p className="font-semibold text-sm text-balance leading-tight">{service.name}</p>
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <CheckCircle2 className="w-5 h-5 text-primary" aria-hidden="true" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedServices.length === 0 && (
              <p className="text-xs text-destructive font-medium mt-3">Vui lòng chọn ít nhất 1 dịch vụ</p>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-4">
          <Button type="button" variant="outline" size="lg" onClick={onBack} className="h-14 px-8 rounded-full text-base font-bold">
            Quay lại Nội quy
          </Button>
          <Button type="submit" size="lg" disabled={isSubmitting} className="h-14 px-10 rounded-full text-lg font-bold shadow-lg shadow-primary/20">
            {isSubmitting ? "Đang lưu..." : "Tiếp theo — Tải tài liệu"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
