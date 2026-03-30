"use client"

import React, { useEffect, useRef, useState } from 'react'
import { ImageCarousel } from '@/features/auth/_components/authv1/ImageCarousel'
import { Toaster, toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useZodValidation } from '@/features/auth/hooks/useZodValidation'
import { signin } from '@/features/auth/schemas/signup.schema'
import Link from 'next/link'
import { motion, Variants } from 'motion/react';
import { useLogin } from '@/features/auth/hooks/auth.hooks'
import { Checkbox } from '@/components/ui/checkbox'
import { SocialSignIn } from './SocialSignIn'
import { useRouter } from 'next/navigation'

export const fadeUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
    }),
};
export const SignInFlow = () => {
    const router = useRouter()
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setErrors] = useState<any>({});
    const validate = useZodValidation(signin);

    const login = useLogin()

    const handleSubmit = async (e: React.FormEvent) => {
        if (login.isPending) return
        try {
            e.preventDefault();
            const { success, errors } = validate(formData);
            if (!success) return setErrors(errors);
            // console.log(formData);

            login.mutate(formData)
            
        } catch (error) {
            console.log(error);
        }
    };
    // ?email=${formData.email}&name=${formData.name}

    return (
        <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
            <Toaster richColors position="top-right" />

            <ImageCarousel valueAuthType="signin" />

            <div className="flex-1 flex items-start xl:items-center justify-center p-8 overflow-y-auto bg-background">
                <div className="w-full max-w-md space-y-6">

                    {/* Heading */}
                    <motion.div
                        className="space-y-3 text-center lg:text-left"
                        custom={0} variants={fadeUp} initial="hidden" animate="show"
                    >
                        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                            Đăng nhập
                        </h1>
                        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                            Sử dụng tài khoản{' '}
                            <span className="font-semibold text-primary">King Of Service</span>{' '}
                            để tiếp tục dịch vụ
                        </p>
                    </motion.div>

                    {/* Form */}
                    <motion.form
                        onSubmit={handleSubmit}
                        className="space-y-4"
                        custom={1} variants={fadeUp} initial="hidden" animate="show"
                    >
                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    className="pl-10 bg-card border-border focus-visible:ring-primary"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            {error.email && <p className="text-xs text-destructive font-medium">{error.email}</p>}
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Mật khẩu</Label>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    className="pl-10 pr-10 bg-card border-border focus-visible:ring-primary"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {error.password && <p className="text-xs text-destructive font-medium">{error.password}</p>}
                        </div>
                        <div className="space-y-2 flex flex-row items-center justify-between">
                            <div className="flex flex-row items-center gap-2">
                                <Checkbox
                                    // checked={remember}
                                    // onCheckedChange={(checked) => handleChange(!!checked)}
                                    className="mt-[2px]"
                                />

                                <span className="text-sm text-muted-foreground">
                                    Ghi nhớ đăng nhập
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <Link href="#" className="text-xs text-primary hover:underline font-medium">
                                    Quên mật khẩu?
                                </Link>
                            </div>
                        </div>

                        {/* Submit */}
                        <Button
                            type="submit"
                            className="w-full bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
                        >
                            {login.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang xác thực...
                                </>
                            ) : (
                                'Đăng nhập'
                            )}
                        </Button>
                    </motion.form>

                    {/* Divider */}
                    <motion.div
                        className="relative"
                        custom={2} variants={fadeUp} initial="hidden" animate="show"
                    >
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Hoặc đăng nhập với</span>
                        </div>
                    </motion.div>

                    {/* Social */}
                    <motion.div
                        custom={3} variants={fadeUp} initial="hidden" animate="show"
                    >
                        <SocialSignIn
                            url_gg="http://localhost:5000/api/v1/auth/google"
                            url_apple="http://localhost:5000/api/v1/auth/apple"
                            text_gg="Đăng nhập với Google"
                            text_apple="Đăng nhập với Apple"
                        />
                    </motion.div>

                    {/* Register link */}
                    <motion.p
                        className="text-center text-sm text-muted-foreground"
                        custom={4} variants={fadeUp} initial="hidden" animate="show"
                    >
                        Chưa có tài khoản?{' '}
                        <Link href="/register" className="text-primary font-bold hover:underline underline-offset-4">
                            Đăng ký miễn phí
                        </Link>
                    </motion.p>

                </div>
            </div>
        </div>
    )
}

export default SignInFlow