"use client";

import React from "react";
import { motion } from "motion/react";
import type { Variants } from "motion/react";
import { Mail, ArrowRight, RefreshCw, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ImageCarousel } from "@/features/auth/_components/authv1/ImageCarousel";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" },
  }),
};

export default function VerifyEmailNoticePage() {
  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Cột trái: Carousel hình ảnh thương hiệu */}
      <ImageCarousel valueAuthType="signin" />

      {/* Cột phải: Nội dung thông báo */}
      <div className="flex-1 flex items-start xl:items-center justify-center p-8 overflow-y-auto bg-background">
        <div className="w-full max-w-md space-y-6">
          
          {/* Biểu tượng và Tiêu đề */}
          <motion.div
            className="space-y-3 text-center lg:text-left"
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            <div className="w-16 h-16 bg-[#fd7e14]/10 rounded-full flex items-center justify-center mx-auto lg:mx-0 mb-4">
              <Mail className="w-8 h-8 text-[#fd7e14]" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
              Xác thực Email
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Chúng tôi đã gửi một liên kết xác thực đến email của bạn. Vui lòng kiểm tra hộp thư để kích hoạt tài khoản.
            </p>
          </motion.div>

          {/* Hành động */}
          <motion.div
            className="space-y-4"
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            <Button asChild className="w-full bg-[#fd7e14] hover:bg-[#fd7e14]/90 text-white rounded-xl h-11 shadow-sm">
              <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-full">
                Mở Gmail <ArrowRight className="w-4 h-4 ml-1.5" />
              </a>
            </Button>
            
            <Button variant="outline" className="w-full rounded-xl h-11 border-border bg-card hover:bg-muted">
              <RefreshCw className="w-4 h-4 mr-1.5" /> Gửi lại email xác thực
            </Button>
          </motion.div>

          {/* Liên kết quay lại */}
          <motion.p
            className="text-center lg:text-left text-sm text-muted-foreground"
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            Đã xác thực xong?{' '}
            <Link href="/login" className="text-[#fd7e14] font-bold hover:underline underline-offset-4">
              Đăng nhập ngay
            </Link>
          </motion.p>

        </div>
      </div>
    </div>
  );
}
