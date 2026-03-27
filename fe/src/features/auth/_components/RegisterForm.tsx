"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { Variants } from "motion/react";
import { Chrome, Eye, EyeOff, Facebook, Lock, Mail, Phone, User, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CardDescription, CardTitle } from "@/components/ui/card";

type RegisterValues = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

const formV: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

const itemV: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.95,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export default function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [values, setValues] = useState<RegisterValues>({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const setField = <K extends keyof RegisterValues>(key: K, val: RegisterValues[K]) => {
    setValues((p) => ({ ...p, [key]: val }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    await new Promise((r) => setTimeout(r, 1200));
    console.log("REGISTER submit:", values);

    setIsLoading(false);
  };

  return (
    <motion.form
      onSubmit={onSubmit}
      className="space-y-6"
      variants={formV}
      initial="hidden"
      animate="show"
    >
      {/* Title */}
      <motion.div variants={itemV}>
        <div>
          <CardTitle className="text-3xl mb-2">Bắt đầu ngay hôm nay</CardTitle>
          <CardDescription className="text-base">
            Tạo tài khoản để trải nghiệm đầy đủ tính năng
          </CardDescription>
        </div>
      </motion.div>

      {/* Name */}
      <motion.div variants={itemV}>
        <div className="space-y-2">
          <Label htmlFor="reg-name" className="text-sm font-semibold">
            Họ và tên
          </Label>
          <div className="relative group">
            <motion.div
              className="absolute -inset-0.5 bg-gradient-to-r from-[#7FA84F] to-[#6B9440] rounded-xl opacity-0 group-hover:opacity-100 blur transition-opacity"
              animate={{ opacity: focusedField === "name" ? 0.3 : 0 }}
            />
            <div className="relative flex items-center">
              <User className="absolute left-4 w-5 h-5 text-muted-foreground" />
              <Input
                id="reg-name"
                type="text"
                value={values.name}
                onChange={(e) => setField("name", e.target.value)}
                onFocus={() => setFocusedField("name")}
                onBlur={() => setFocusedField(null)}
                className="pl-12 h-12 bg-white border-2 rounded-xl focus-visible:ring-[#7FA84F]"
                placeholder="Nguyễn Văn A"
                required
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Email */}
      <motion.div variants={itemV}>
        <div className="space-y-2">
          <Label htmlFor="reg-email" className="text-sm font-semibold">
            Email
          </Label>
          <div className="relative group">
            <motion.div
              className="absolute -inset-0.5 bg-gradient-to-r from-[#7FA84F] to-[#6B9440] rounded-xl opacity-0 group-hover:opacity-100 blur transition-opacity"
              animate={{ opacity: focusedField === "email" ? 0.3 : 0 }}
            />
            <div className="relative flex items-center">
              <Mail className="absolute left-4 w-5 h-5 text-muted-foreground" />
              <Input
                id="reg-email"
                type="email"
                value={values.email}
                onChange={(e) => setField("email", e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                className="pl-12 h-12 bg-white border-2 rounded-xl focus-visible:ring-[#7FA84F]"
                placeholder="example@restaurant.com"
                required
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Phone */}
      <motion.div variants={itemV}>
        <div className="space-y-2">
          <Label htmlFor="reg-phone" className="text-sm font-semibold">
            Số điện thoại
          </Label>
          <div className="relative group">
            <motion.div
              className="absolute -inset-0.5 bg-gradient-to-r from-[#7FA84F] to-[#6B9440] rounded-xl opacity-0 group-hover:opacity-100 blur transition-opacity"
              animate={{ opacity: focusedField === "phone" ? 0.3 : 0 }}
            />
            <div className="relative flex items-center">
              <Phone className="absolute left-4 w-5 h-5 text-muted-foreground" />
              <Input
                id="reg-phone"
                type="tel"
                value={values.phone}
                onChange={(e) => setField("phone", e.target.value)}
                onFocus={() => setFocusedField("phone")}
                onBlur={() => setFocusedField(null)}
                className="pl-12 h-12 bg-white border-2 rounded-xl focus-visible:ring-[#7FA84F]"
                placeholder="0123 456 789"
                required
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Password */}
      <motion.div variants={itemV}>
        <div className="space-y-2">
          <Label htmlFor="reg-password" className="text-sm font-semibold">
            Mật khẩu
          </Label>
          <div className="relative group">
            <motion.div
              className="absolute -inset-0.5 bg-gradient-to-r from-[#7FA84F] to-[#6B9440] rounded-xl opacity-0 group-hover:opacity-100 blur transition-opacity"
              animate={{ opacity: focusedField === "password" ? 0.3 : 0 }}
            />
            <div className="relative flex items-center">
              <Lock className="absolute left-4 w-5 h-5 text-muted-foreground" />
              <Input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                value={values.password}
                onChange={(e) => setField("password", e.target.value)}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                className="pl-12 pr-12 h-12 bg-white border-2 rounded-xl focus-visible:ring-[#7FA84F]"
                placeholder="••••••••••"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 hover:bg-transparent"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Eye className="w-5 h-5 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Submit */}
      <motion.div variants={itemV}>
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 bg-gradient-to-r from-[#7FA84F] to-[#6B9440] hover:from-[#6B9440] hover:to-[#5A8435] text-white rounded-xl font-semibold shadow-lg hover:shadow-2xl transition-all group"
        >
          {isLoading ? (
            <>
              <motion.div
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mr-2"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              Đang xử lý...
            </>
          ) : (
            <>
              Tạo tài khoản
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
      </motion.div>

      {/* Divider */}
      <motion.div variants={itemV}>
        <div className="relative">
          <Separator className="my-8" />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-sm text-muted-foreground">
            Hoặc tiếp tục với
          </span>
        </div>
      </motion.div>

      {/* Social */}
      <motion.div variants={itemV}>
        <div className="grid grid-cols-2 gap-4">
          <Button
            type="button"
            variant="outline"
            className="h-12 border-2 hover:border-[#7FA84F] hover:bg-gray-50 rounded-xl"
          >
            <Chrome className="w-5 h-5 mr-2" />
            Google
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 border-2 hover:border-[#7FA84F] hover:bg-gray-50 rounded-xl"
          >
            <Facebook className="w-5 h-5 mr-2" />
            Facebook
          </Button>
        </div>
      </motion.div>

      {/* Terms */}
      <motion.div variants={itemV}>
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          Bằng việc đăng ký, bạn đồng ý với{" "}
          <Button
            type="button"
            variant="link"
            className="text-[#7FA84F] hover:text-[#6B9440] p-0 h-auto text-xs font-medium"
          >
            Điều khoản dịch vụ
          </Button>{" "}
          và{" "}
          <Button
            type="button"
            variant="link"
            className="text-[#7FA84F] hover:text-[#6B9440] p-0 h-auto text-xs font-medium"
          >
            Chính sách bảo mật
          </Button>{" "}
          của chúng tôi
        </p>
      </motion.div>
    </motion.form>
  );
}