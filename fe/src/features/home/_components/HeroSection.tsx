"use client";

import React from "react";
import { motion, Variants } from "framer-motion"; // Dùng bản framer-motion ổn định
import { BadgeCheck, ShieldCheck, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import Container from "@/components/Container";

const TRUST_BADGES = [
  { icon: BadgeCheck, label: "Nhân viên chuẩn mực" },
  { icon: ShieldCheck, label: "Bảo hiểm tài sản 100Tr" },
  { icon: Clock, label: "Có mặt sau 60 phút" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

const blurVariants: Variants = {
  animate: {
    scale: [1, 1.1, 1],
    opacity: [0.3, 0.5, 0.3],
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export default function HeroSection() {
  return (
    <Container
      classNameContent="pb-30 pt-15"
    >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.25 }}
          transition={{ duration: 2 }}
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
          }}
        />

        <motion.div
          variants={blurVariants}
          animate="animate"
          className="pointer-events-none absolute -top-36 -right-24 w-[520px] h-[520px] rounded-full blur-[80px] bg-[radial-gradient(circle,rgba(99,102,241,0.12)_0%,transparent_70%)]"
        />
        <motion.div
          variants={blurVariants}
          animate="animate"
          className="pointer-events-none absolute -bottom-20 -left-20 w-[380px] h-[380px] rounded-full blur-[80px] bg-[radial-gradient(circle,rgba(129,140,248,0.09)_0%,transparent_70%)]"
        />

        <motion.div
          className="relative z-10 max-w-4xl mx-auto text-center"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-8 backdrop-blur-md"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(253,126,20,0.8)]" />
            100,000+ GIA ĐÌNH TIN DÙNG
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-[clamp(42px,7vw,76px)] font-black leading-[1.1] tracking-tight text-slate-900 dark:text-white mb-6 font-serif"
          >
            Không gian sạch sẽ, <br className="hidden md:block" />
            <motion.em
              initial={{ backgroundSize: "0% 3px" }}
              whileInView={{ backgroundSize: "100% 3px" }}
              transition={{ delay: 0.8, duration: 1 }}
              className="not-italic text-primary relative bg-linear-to-r from-transparent via-primary/30 to-transparent bg-bottom bg-no-repeat pb-1"
            >
              cuộc sống thảnh thơi
            </motion.em>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-base md:text-lg leading-relaxed font-normal text-slate-600 dark:text-slate-300 max-w-xl mx-auto mb-10"
          >
            Giải pháp dọn dẹp nhà cửa thông minh. Đặt lịch nhanh chóng trong 60 giây, nhân viên chuyên nghiệp có mặt chỉ sau 1 giờ.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="max-w-[600px] mx-auto mb-14"
          >
            <div
              className="flex items-center gap-3 bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-[2rem] p-2 pl-6
              shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300
              focus-within:border-primary/50 focus-within:shadow-[0_8px_30px_rgba(253,126,20,0.15)] focus-within:ring-4 ring-primary/10"
            >
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                className="flex-1 bg-transparent border-none outline-none text-base font-medium text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal"
                placeholder="Bạn muốn dọn dẹp gì hôm nay?"
              />
              <Button size="lg" className="rounded-full px-8 h-12 text-[15px] font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 transition-all">
                Tìm ngay
              </Button>
            </div>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            variants={itemVariants}
            className="border-t border-border/50 pt-6 max-w-[520px] mx-auto"
          >
            <div className="flex flex-wrap justify-center gap-y-2">
              {TRUST_BADGES.map(({ icon: Icon, label }, index) => (
                <motion.span
                  key={label}
                  whileHover={{ scale: 1.05, color: "var(--primary)" }}
                  className="relative flex items-center gap-2.5 text-[14px] font-medium text-slate-600 dark:text-slate-400 px-6 py-2 cursor-default transition-colors
                  not-first:before:absolute not-first:before:left-0
                  not-first:before:top-1/2 not-first:before:-translate-y-1/2
                  not-first:before:h-4 not-first:before:w-px
                  not-first:before:bg-slate-300 dark:not-first:before:bg-slate-700"
                >
                  <Icon className="w-5 h-5 text-primary shrink-0" strokeWidth={2.5} />
                  {label}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </motion.div>
    </Container>
  );
}
