import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Briefcase, Phone, MapPin, Home } from "lucide-react";

const personalInfoSchema = z.object({
  bio: z.string().min(20, "Giới thiệu bản thân tối thiểu 20 ký tự"),
  experience: z.string().min(1, "Vui lòng mô tả kinh nghiệm của bạn"),
  phone: z.string().regex(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, "Số điện thoại không hợp lệ"),
  skills: z.string().min(1, "Vui lòng nhập các kỹ năng chính"),
  addressResident: z.string().min(5, "Vui lòng nhập địa chỉ thường trú (theo CCCD)"),
  addressCurrent: z.string().min(5, "Vui lòng nhập địa chỉ chỗ ở hiện tại"),
});

export type PersonalInfoValues = z.infer<typeof personalInfoSchema>;

interface StepPersonalInfoProps {
  initialValues?: Partial<PersonalInfoValues>;
  onNext: (values: PersonalInfoValues) => void;
  isSubmitting?: boolean;
}

export const StepPersonalInfo: React.FC<StepPersonalInfoProps> = ({ initialValues, onNext, isSubmitting }) => {
  const form = useForm<PersonalInfoValues>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      bio: initialValues?.bio || "",
      experience: initialValues?.experience || "",
      phone: initialValues?.phone || "",
      skills: initialValues?.skills || "",
      addressResident: initialValues?.addressResident || "",
      addressCurrent: initialValues?.addressCurrent || "",
    },
  });

  return (
    <Card className="border-none shadow-none bg-transparent md:shadow-xl md:bg-card/50 md:backdrop-blur-md rounded-none md:rounded-[2.5rem] overflow-hidden">
      <CardHeader className="pt-6 px-4 md:pt-10 md:px-10">
        <CardTitle className="text-2xl md:text-3xl font-bold font-serif text-primary">Thông tin cá nhân</CardTitle>
        <CardDescription className="text-base md:text-lg">Hãy cung cấp thông tin liên hệ và nghề nghiệp chính xác.</CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-10">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onNext)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm md:text-base flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary" /> Số điện thoại liên hệ <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="0987654321" className="h-12 md:h-14 rounded-xl md:rounded-2xl bg-background/50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="skills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm md:text-base flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-primary" /> Kỹ năng chính <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Ví dụ: Dọn nhà, Vệ sinh sofa, Điện nước..." className="h-12 md:h-14 rounded-xl md:rounded-2xl bg-background/50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressResident"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm md:text-base flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" /> Địa chỉ thường trú (Theo CCCD) <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố" className="h-12 md:h-14 rounded-xl md:rounded-2xl bg-background/50" {...field} />
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
                    <FormLabel className="text-sm md:text-base flex items-center gap-2">
                      <Home className="w-4 h-4 text-primary" /> Chỗ ở hiện tại <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Địa chỉ bạn đang sinh sống để nhận việc gần nhà" className="h-12 md:h-14 rounded-xl md:rounded-2xl bg-background/50" {...field} />
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
                  <FormLabel className="text-sm md:text-base flex items-center gap-2">Kinh nghiệm làm việc <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Mô tả ngắn gọn kinh nghiệm dọn dẹp của bạn (ví dụ: 3 năm làm việc tại công ty dọn dẹp...)" 
                      className="min-h-[100px] rounded-xl md:rounded-2xl bg-background/50 p-4" 
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
                  <FormLabel className="text-sm md:text-base flex items-center gap-2">Lời chào tới khách hàng <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Viết một đoạn ngắn giới thiệu bản thân và cam kết chất lượng dịch vụ để khách hàng tin tưởng..." 
                      className="min-h-[120px] rounded-xl md:rounded-2xl bg-background/50 p-4" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4 border-t border-border/50 mt-6 md:mt-10">
              <Button type="submit" size="lg" disabled={isSubmitting} className="h-12 md:h-14 px-8 md:px-10 rounded-full text-base md:text-lg font-bold shadow-lg shadow-primary/20">
                {isSubmitting ? "Đang lưu..." : "Tiếp tục"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
