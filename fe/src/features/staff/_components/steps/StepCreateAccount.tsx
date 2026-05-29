import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

const registerSchema = z.object({
  fullName: z.string().min(2, "Họ và tên tối thiểu 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
});

export type StepCreateAccountValues = z.infer<typeof registerSchema>;

interface StepCreateAccountProps {
  onNext: (values: Omit<StepCreateAccountValues, "confirmPassword">) => void;
  isSubmitting?: boolean;
}

export const StepCreateAccount: React.FC<StepCreateAccountProps> = ({ onNext, isSubmitting }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<StepCreateAccountValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = (values: StepCreateAccountValues) => {
    const { confirmPassword: _confirm, ...rest } = values;
    onNext(rest);
  };

  return (
    <Card className="border-none shadow-xl bg-card/50 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
      <CardHeader className="pt-10 px-10">
        <CardTitle className="text-3xl font-bold font-serif text-primary">Tạo tài khoản Đối tác</CardTitle>
        <CardDescription className="text-lg">
          Bắt đầu hành trình của bạn cùng CleanZ. Tạo tài khoản để tiếp tục hoàn thiện hồ sơ.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-10">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">

            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> Họ và tên <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Nguyễn Văn A" className="h-14 rounded-2xl bg-background/50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" /> Email đăng nhập <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="partner@cleanZ.vn" className="h-14 rounded-2xl bg-background/50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary" /> Mật khẩu <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Tối thiểu 8 ký tự"
                          className="h-14 rounded-2xl bg-background/50 pr-12"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(p => !p)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary" /> Xác nhận mật khẩu <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirm ? "text" : "password"}
                          placeholder="Nhập lại mật khẩu"
                          className="h-14 rounded-2xl bg-background/50 pr-12"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(p => !p)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Bằng cách tạo tài khoản, bạn đồng ý với{" "}
              <a href="/terms" className="text-primary font-semibold hover:underline">Điều khoản dịch vụ</a>
              {" "}và{" "}
              <a href="/privacy" className="text-primary font-semibold hover:underline">Chính sách bảo mật</a>
              {" "}của CleanZ.
            </p>

            <div className="flex justify-end pt-4 border-t border-border/50 mt-6">
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="h-14 px-10 rounded-full text-lg font-bold shadow-lg shadow-primary/20"
              >
                {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản & Tiếp tục"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
