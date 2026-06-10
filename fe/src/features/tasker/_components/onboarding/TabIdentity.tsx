"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserSquare2, Fingerprint, MapPin, CalendarDays, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { DocumentUploader } from "./DocumentUploader";
import { cn } from "@/lib/utils";

// --- GUIDELINES Dành cho Dịch vụ Dọn dẹp ---
const AVATAR_GUIDELINE = {
  title: "Ảnh đại diện (Selfie)",
  sampleImages: [
    "https://ui-avatars.com/api/?name=NV+A&background=random&size=200", // Placeholder
    "https://ui-avatars.com/api/?name=NV+B&background=random&size=200",
  ],
  dos: [
    "Ảnh chụp chính diện, rõ nét, nền trơn",
    "Từ phần ngực trở lên, thấy rõ khuôn mặt",
    "Ánh sáng đầy đủ, trang phục lịch sự"
  ],
  donts: [
    "KHÔNG đội mũ, đeo kính râm, đeo khẩu trang",
    "KHÔNG sử dụng ảnh thẻ hoặc ảnh chụp lại qua màn hình",
    "KHÔNG có người hoặc vật thể lạ trong khung hình"
  ]
};

const CCCD_GUIDELINE = {
  title: "CCCD / CMND gắn chip",
  sampleImages: [
    "https://placehold.co/400x250/e2e8f0/475569?text=Mặt+Trước",
    "https://placehold.co/400x250/e2e8f0/475569?text=Mặt+Sau",
  ],
  dos: [
    "Còn hạn sử dụng ít nhất 1 tháng",
    "Độ tuổi từ 18 - 55 tuổi (với dịch vụ dọn dẹp)",
    "Chụp rõ nét, đủ sáng, đọc được toàn bộ thông tin"
  ],
  donts: [
    "KHÔNG chụp mất góc, lẹm viền",
    "KHÔNG để ảnh bị lóa sáng che mất chữ/số",
    "KHÔNG dùng bản photo, scan hoặc chụp qua màn hình"
  ]
};

// --- SCHEMA VALIDATION ---
const identitySchema = z.object({
  idNumber: z.string()
    .min(9, "Phải có 9-12 chữ số. Ví dụ: 001202020202")
    .max(12, "Số CCCD không được vượt quá 12 chữ số")
    .regex(/^\d+$/, "Chỉ được nhập số, không bao gồm chữ cái hoặc ký tự đặc biệt"),
  issueDate: z.string().min(1, "Vui lòng nhập ngày cấp"),
  issuePlace: z.string().min(1, "Vui lòng nhập nơi cấp"),
});

type IdentityValues = z.infer<typeof identitySchema>;

interface TabIdentityProps {
  onBack: () => void;
  onNext: () => void;
}

export function TabIdentity({ onBack, onNext }: TabIdentityProps) {
  const [avatar, setAvatar] = useState<File | null>(null);
  const [cccdFront, setCccdFront] = useState<File | null>(null);
  const [cccdBack, setCccdBack] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<IdentityValues>({
    resolver: zodResolver(identitySchema),
    defaultValues: {
      idNumber: "",
      issueDate: "",
      issuePlace: "",
    },
  });

  const handleSubmit = async (values: IdentityValues) => {
    if (!avatar || !cccdFront || !cccdBack) {
      toast.error("Vui lòng tải lên đầy đủ Ảnh đại diện và 2 mặt CCCD");
      return;
    }

    setIsSubmitting(true);
    try {
      // Giả lập API gọi lên server
      await new Promise(r => setTimeout(r, 1500));
      console.log("Uploaded payload:", { ...values, avatar, cccdFront, cccdBack });
      
      toast.success("Đã lưu thông tin danh tính thành công!");
      onNext();
    } catch {
      toast.error("Đã xảy ra lỗi, vui lòng thử lại sau.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        
        {/* --- SECTION 1: ẢNH ĐẠI DIỆN --- */}
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
          <CardHeader className="pt-10 px-10 pb-6 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <UserSquare2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold font-serif text-primary">Ảnh đại diện</CardTitle>
                <p className="text-muted-foreground text-sm mt-1">
                  Khách hàng sẽ nhìn thấy ảnh này trên ứng dụng
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-10 py-8 flex flex-col items-center">
            <DocumentUploader
              title=""
              isAvatar
              guideline={AVATAR_GUIDELINE}
              value={avatar}
              onChange={setAvatar}
            />
          </CardContent>
        </Card>

        {/* --- SECTION 2: CCCD --- */}
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
          <CardHeader className="pt-10 px-10 pb-6 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Fingerprint className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold font-serif text-primary">Căn cước công dân</CardTitle>
                <p className="text-muted-foreground text-sm mt-1">
                  Bắt buộc để xác minh danh tính đối tác
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
            
            {/* Ảnh CCCD (Grid 2 cột) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DocumentUploader
                title="Mặt trước"
                description="Mặt có ảnh và thông tin"
                guideline={CCCD_GUIDELINE}
                value={cccdFront}
                onChange={setCccdFront}
              />
              <DocumentUploader
                title="Mặt sau"
                description="Mặt có vân tay và chip"
                guideline={CCCD_GUIDELINE}
                value={cccdBack}
                onChange={setCccdBack}
              />
            </div>

            {/* Form CCCD Text */}
            <div className="pt-6 border-t border-border/40 space-y-5">
              <FormField
                control={form.control}
                name="idNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-bold flex items-center gap-2">
                      Số CCCD / CMND <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ví dụ: 001202020202" 
                        className={cn(
                          "h-14 rounded-2xl bg-background/50",
                          form.formState.errors.idNumber && "border-destructive focus-visible:ring-destructive"
                        )} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-destructive" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-bold flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-primary" /> Ngày cấp <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="date" className="h-14 rounded-2xl bg-background/50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="issuePlace"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-bold flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" /> Nơi cấp <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Cục cảnh sát QLHC..." className="h-14 rounded-2xl bg-background/50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

          </CardContent>
        </Card>

        {/* --- FOOTER ACTIONS --- */}
        <div className="flex justify-between items-center pt-4">
          <Button type="button" variant="ghost" size="lg" onClick={onBack} className="h-14 px-8 rounded-full text-base font-bold">
            Quay lại
          </Button>
          <Button 
            type="submit" 
            size="lg" 
            disabled={isSubmitting} 
            className="h-14 px-10 rounded-full text-lg font-bold shadow-lg shadow-primary/20"
          >
            {isSubmitting ? "Đang xử lý..." : "Lưu & Kế tiếp"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
