"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "motion/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import TopLoadingBar from "@/components/loadings/TopLoadingBar";
import { Users, Sparkles, ArrowRight, Briefcase, Star, Clock, Shield, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import LogoApp from "@/components/logo/LogoApp";

const SignUpFlow = dynamic(
  () => import("@/features/auth/_components/authv1/SignUpFlow"),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-screen"><TopLoadingBar /></div> }
);

type Role = "customer" | "tasker" | null;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: "easeOut" },
  }),
};

export default function RegisterPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Xử lý redirect cho Tasker trong useEffect — tránh gọi router.push trong render
  useEffect(() => {
    if (confirmed && selectedRole === "tasker") {
      router.push("/register-tasker");
    }
  }, [confirmed, selectedRole, router]);

  if (confirmed && selectedRole === "customer") {
    return <SignUpFlow />;
  }

  // Cứ để form render trong khi router.push đang hoạt động để tránh crash unmount

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/8 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/8 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/8 rounded-full blur-[80px]" />
      </div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Header */}
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show" className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <LogoApp />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-serif text-balance mb-3">
            Bạn muốn tạo <span className="text-primary italic">tài khoản gì?</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Chọn loại tài khoản phù hợp với mục đích sử dụng của bạn
          </p>
        </motion.div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          {/* Customer Card */}
          <motion.button
            custom={1} variants={fadeUp} initial="hidden" animate="show"
            onClick={() => setSelectedRole("customer")}
            className={cn(
              "group relative text-left p-8 rounded-[2.5rem] border-2 transition-all duration-300 overflow-hidden",
              selectedRole === "customer"
                ? "border-primary bg-primary/8 shadow-xl shadow-primary/15"
                : "border-border/50 bg-card/50 hover:border-primary/40 hover:bg-primary/5 hover:shadow-lg"
            )}
          >
            {selectedRole === "customer" && (
              <div className="absolute top-5 right-5 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-md">
                <Sparkles className="w-4 h-4 text-primary-foreground" aria-hidden="true" />
              </div>
            )}

            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
              <Users className="w-8 h-8 text-blue-500" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Khách hàng</h2>
            <p className="text-muted-foreground text-sm text-pretty leading-relaxed mb-5">
              Đặt lịch dọn dẹp nhà cửa, văn phòng nhanh chóng và tiện lợi với đội ngũ đối tác uy tín của CleanZ.
            </p>
            <ul className="space-y-2">
              {["Đặt lịch trong 60 giây", "Xem lịch sử dịch vụ", "Đánh giá & nhận ưu đãi"].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {item}
                </li>
              ))}
            </ul>
            <div className={cn(
              "mt-6 flex items-center gap-2 text-sm font-bold transition-colors",
              selectedRole === "customer" ? "text-primary" : "text-muted-foreground group-hover:text-primary"
            )}>
              Chọn tài khoản này <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-all" />
          </motion.button>

          {/* Tasker Card */}
          <motion.button
            custom={2} variants={fadeUp} initial="hidden" animate="show"
            onClick={() => setSelectedRole("tasker")}
            className={cn(
              "group relative text-left p-8 rounded-[2.5rem] border-2 transition-all duration-300 overflow-hidden",
              selectedRole === "tasker"
                ? "border-primary bg-primary/8 shadow-xl shadow-primary/15"
                : "border-border/50 bg-card/50 hover:border-primary/40 hover:bg-primary/5 hover:shadow-lg"
            )}
          >
            {selectedRole === "tasker" && (
              <div className="absolute top-5 right-5 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-md">
                <Sparkles className="w-4 h-4 text-primary-foreground" aria-hidden="true" />
              </div>
            )}

            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
              <Briefcase className="w-8 h-8 text-primary" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Nhân viên dọn dẹp</h2>
            <p className="text-muted-foreground text-sm text-pretty leading-relaxed mb-5">
              Trở thành đối tác CleanZ, chủ động thời gian làm việc và tăng thu nhập lên đến 20-25 triệu/tháng.
            </p>
            <ul className="space-y-2">
              {[
                { icon: Star, text: "Thu nhập hấp dẫn" },
                { icon: Clock, text: "Tự chủ lịch làm việc" },
                { icon: Shield, text: "Bảo hiểm toàn diện" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>
            <div className={cn(
              "mt-6 flex items-center gap-2 text-sm font-bold transition-colors",
              selectedRole === "tasker" ? "text-primary" : "text-muted-foreground group-hover:text-primary"
            )}>
              Trở thành Đối tác <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-all" />
          </motion.button>
        </div>

        {/* CTA Buttons — hiện khi đã chọn role */}
        <AnimatePresence>
          {selectedRole && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 p-5 bg-background/90 backdrop-blur-2xl border-t border-border/50 shadow-[0_-20px_50px_rgba(0,0,0,0.15)] z-50 flex flex-col sm:flex-row gap-3 justify-center md:relative md:bg-transparent md:border-none md:shadow-none md:p-0"
            >
              <Button
                variant="outline"
                size="lg"
                onClick={() => setSelectedRole(null)}
                className="h-14 px-8 rounded-full text-base font-bold gap-2 bg-background md:bg-transparent"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Chọn lại
              </Button>
              <Button
                size="lg"
                onClick={() => setConfirmed(true)}
                className="h-14 px-10 rounded-full text-[15px] md:text-lg font-bold shadow-xl shadow-primary/30 gap-2"
              >
                {selectedRole === "customer" ? "Đăng ký tài khoản Khách hàng" : "Đăng ký làm Đối tác CleanZ"}
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.p
          custom={4} variants={fadeUp} initial="hidden" animate="show"
          className="text-center text-sm text-muted-foreground mt-8 pb-32 md:pb-0"
        >
          Đã có tài khoản?{" "}
          <Link href="/login" className="text-primary font-bold hover:underline underline-offset-4">Đăng nhập ngay</Link>
          {" · "}
          <Link href="/login-tasker" className="text-primary font-bold hover:underline underline-offset-4">Đăng nhập Đối tác</Link>
        </motion.p>
      </div>
    </div>
  );
}