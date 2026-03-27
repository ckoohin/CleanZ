"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { Variants } from "motion/react";
import { Chrome, Eye, EyeOff, Facebook, Lock, Mail, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { useLogin } from "@/features/auth/hooks/auth.hooks";
import { useRouter } from "next/navigation";
import { LoginValues } from "@/features/auth/types/auth.type";
import { log } from "console";
import { toast, Toaster } from "sonner"

export default function LoginForm() {
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const login = useLogin();
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginValues>({
        defaultValues: {
            email: "",
            password: "",
            rememberMe: false,
        },
    });

    const onSubmit = async (value: LoginValues) => {
        console.log(1);
        
        try {
            console.log(`valueLogin: `, value);
            const data = await login.mutateAsync({
                email: value.email,
                password: value.password,
            });
            console.log(`data: `, data);
            
            router.replace("/");
        } catch (err: any) {
            console.log("Login failed", err.response.data.message);
            toast.error(`${err.response.data.message.message}`, {
                position: "top-right",
            })
        }
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

    const formV: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08,
                delayChildren: 0.04,
            },
        },
    };

    return (
        <>
        <motion.form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
            variants={formV}
            initial="hidden"
            animate="show"
        >
            {/* Title */}
            <motion.div variants={itemV}>
                <div>
                    <CardTitle className="text-3xl mb-2">Chào mừng trở lại!</CardTitle>
                    <CardDescription className="text-base">
                        Đăng nhập để tiếp tục quản lý nhà hàng
                    </CardDescription>
                </div>
            </motion.div>

            {/* Email */}
            <motion.div variants={itemV}>
                <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-semibold">
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
                                id="login-email"
                                type="email"
                                {...register("email", { required: "Email là bắt buộc" })}
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

            {/* Password */}
            <motion.div variants={itemV}>
                <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-semibold">
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
                                id="login-password"
                                type={showPassword ? "text" : "password"}
                                {...register("password", { required: "Mật khẩu là bắt buộc" })}
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

            {/* Remember + Forgot */}
            <motion.div variants={itemV}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="remember"
                            {...register("rememberMe")}
                            className="data-[state=checked]:bg-[#7FA84F] data-[state=checked]:border-[#7FA84F]"
                        />
                        <Label htmlFor="remember" className="text-sm cursor-pointer">
                            Ghi nhớ đăng nhập
                        </Label>
                    </div>

                    <Button
                        type="button"
                        variant="link"
                        className="text-[#7FA84F] hover:text-[#6B9440] p-0 h-auto font-semibold"
                    >
                        Quên mật khẩu?
                    </Button>
                </div>
            </motion.div>

            {/* Submit */}
            <motion.div variants={itemV}>
                <Button
                    type="submit"
                    disabled={login.isPending}
                    className="w-full h-12 bg-gradient-to-r from-[#7FA84F] to-[#6B9440] hover:from-[#6B9440] hover:to-[#5A8435] text-white rounded-xl font-semibold shadow-lg hover:shadow-2xl transition-all group"
                >
                    {login.isPending ? (
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
                            Đăng nhập ngay
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
        </motion.form>
        </>
    );
}