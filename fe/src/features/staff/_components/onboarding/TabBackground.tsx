"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MapPin, CalendarDays, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { DocumentUploader } from "./DocumentUploader";

// --- GUIDELINES Dành cho Dịch vụ Dọn dẹp ---
const BACKGROUND_GUIDELINE = {
  title: "Lý lịch tư pháp bản gốc",
  sampleImages: [
    "https://placehold.co/400x250/e2e8f0/475569?text=Mẫu+Lý+Lịch",
  ],
  dos: [
    "Giấy tờ còn hạn sử dụng ít nhất 6 tháng",
    "Chụp bản gốc, không dùng bản photo",
    "Chụp rõ nét, thấy đầy đủ con dấu đỏ và chữ ký"
  ],
  donts: [
    "KHÔNG chụp mất góc giấy tờ",
    "KHÔNG nộp giấy xác nhận hạnh kiểm của địa phương (Chỉ nhận LLTP)",
    "KHÔNG tẩy xóa hoặc chỉnh sửa nội dung"
  ]
};

// --- SCHEMA VALIDATION ---
const backgroundSchema = z.object({
  issueDate: z.string().min(1, "Vui lòng nhập ngày cấp"),
  issuePlace: z.string().min(1, "Vui lòng nhập nơi cấp"),
});

type BackgroundValues = z.infer<typeof backgroundSchema>;

interface TabBackgroundProps {
  onBack: () => void;
  onNext: () => void;
}

export function TabBackground({ onBack, onNext }: TabBackgroundProps) {
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BackgroundValues>({
    resolver: zodResolver(backgroundSchema),
    defaultValues: {
      issueDate: "",
      issuePlace: "",
    },
  });

  const handleSubmit = async (values: BackgroundValues) => {
    if (!documentFile) {
      toast.error("Vui lòng tải lên ảnh Lý lịch tư pháp");
      return;
    }

    setIsSubmitting(true);
    try {
      // Giả lập API gọi lên server
      await new Promise(r => setTimeout(r, 1500));
      console.log("Uploaded payload:", { ...values, documentFile });
      
      toast.success("Đã lưu thông tin pháp lý thành công!");
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
        
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
          <CardHeader className="pt-10 px-10 pb-6 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold font-serif text-primary">Lý lịch tư pháp</CardTitle>
                <p className="text-muted-foreground text-sm mt-1">
                  Đảm bảo an toàn cho khách hàng khi bạn làm việc tại nhà họ
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
            
            {/* Ảnh Lý Lịch Tư Pháp */}
            <div>
              <DocumentUploader
                title="Bản gốc Lý lịch tư pháp (Số 1 hoặc 2)"
                description="Được cấp bởi Sở Tư pháp tỉnh/thành phố"
                guideline={BACKGROUND_GUIDELINE}
                value={documentFile}
                onChange={setDocumentFile}
              />
            </div>

            {/* Form Fields */}
            <div className="pt-6 border-t border-border/40 grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <Input placeholder="Sở tư pháp Hà Nội..." className="h-14 rounded-2xl bg-background/50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
