"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhoneCall, MapPin, Users, Phone } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// --- SCHEMA VALIDATION ---
const contactSchema = z.object({
  emergencyName: z.string().min(2, "Vui lòng nhập tên người liên hệ"),
  emergencyRelation: z.string().min(1, "Vui lòng chọn mối quan hệ"),
  emergencyPhone: z.string()
    .min(9, "Số điện thoại không hợp lệ")
    .max(11, "Số điện thoại không hợp lệ")
    .regex(/^\d+$/, "Chỉ được nhập số"),
  tempAddressStreet: z.string().min(5, "Vui lòng nhập số nhà/tổ/đường"),
  tempAddressWard: z.string().min(5, "Vui lòng nhập phường/xã"),
});

type ContactValues = z.infer<typeof contactSchema>;

interface TabContactProps {
  onBack: () => void;
  onNext: () => void;
}

export function TabContact({ onBack, onNext }: TabContactProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      emergencyName: "",
      emergencyRelation: "",
      emergencyPhone: "",
      tempAddressStreet: "",
      tempAddressWard: "",
    },
  });

  const handleSubmit = async (values: ContactValues) => {
    setIsSubmitting(true);
    try {
      // Giả lập API gọi lên server
      await new Promise(r => setTimeout(r, 1500));
      console.log("Uploaded payload:", values);
      
      toast.success("Đã lưu thông tin liên hệ thành công!");
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
                <PhoneCall className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold font-serif text-primary">Thông tin Liên hệ Khẩn cấp & Tạm trú</CardTitle>
                <p className="text-muted-foreground text-sm mt-1">
                  Thông tin này chỉ dùng trong các trường hợp cần thiết và bảo mật hoàn toàn
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
            
            {/* Liên Hệ Khẩn Cấp */}
            <div className="space-y-6">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Người liên hệ khẩn cấp
              </h3>
              
              <FormField
                control={form.control}
                name="emergencyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-bold flex items-center gap-2">
                      Tên người liên hệ <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập họ và tên..." className="h-14 rounded-2xl bg-background/50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="emergencyRelation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-bold flex items-center gap-2">
                        Quan hệ <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className={cn(
                            "h-14 rounded-2xl bg-background/50",
                            !field.value && "text-muted-foreground"
                          )}>
                            <SelectValue placeholder="Chọn mối quan hệ" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="spouse">Vợ / Chồng</SelectItem>
                          <SelectItem value="father">Bố / Ba</SelectItem>
                          <SelectItem value="mother">Mẹ / Má</SelectItem>
                          <SelectItem value="sibling">Anh Chị Em Ruột</SelectItem>
                          <SelectItem value="other">Khác</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergencyPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-bold flex items-center gap-2">
                        <Phone className="w-4 h-4 text-primary" /> Điện thoại liên hệ <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="flex h-14 rounded-2xl bg-background/50 border border-input overflow-hidden focus-within:ring-1 focus-within:ring-ring focus-within:border-primary">
                          <div className="flex items-center justify-center px-4 bg-muted/50 text-muted-foreground font-medium border-r border-input">
                            +84
                          </div>
                          <Input 
                            placeholder="0988xxxxxx" 
                            className="h-full border-0 focus-visible:ring-0 rounded-none px-4 flex-1" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Địa Chỉ Tạm Trú */}
            <div className="pt-8 border-t border-border/40 space-y-6">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" /> Địa chỉ tạm trú của Đối tác
              </h3>

              <FormField
                control={form.control}
                name="tempAddressStreet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-bold flex items-center gap-2">
                      Số nhà / Tổ / Đường <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Ví dụ: 123 Lê Lợi..." className="h-14 rounded-2xl bg-background/50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tempAddressWard"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-bold flex items-center gap-2">
                      Xã / Phường <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Ví dụ: Phường Bến Nghé..." className="h-14 rounded-2xl bg-background/50" {...field} />
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
