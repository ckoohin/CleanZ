"use client";

import React from "react";
import { motion, Variants } from "framer-motion"; // Dùng bản framer-motion ổn định
import { BadgeCheck, ShieldCheck, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import Container from "@/components/Container";

const TRUST_BADGES = [
  { icon: BadgeCheck, label: "Thợ đã xác minh" },
  { icon: ShieldCheck, label: "Công việc có bảo hiểm" },
  { icon: Clock, label: "Hỗ trợ 24/7" },
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
            className="inline-flex items-center gap-2 bg-accent/50 text-accent-foreground border border-primary/20 text-[11px] font-medium tracking-[0.1em] uppercase px-3.5 py-1.5 rounded-full mb-9 backdrop-blur-sm"
          >
            <span className="w-[5px] h-[5px] rounded-full bg-primary animate-pulse" />
            1,200+ thợ đã được xác minh
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-[clamp(48px,8vw,85px)] font-light leading-[1.06] tracking-[-0.02em] text-foreground mb-6"
            style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
          >
            Mọi dịch vụ,{" "}
            <motion.em
              initial={{ backgroundSize: "0% 1px" }}
              whileInView={{ backgroundSize: "100% 2px" }}
              transition={{ delay: 0.8, duration: 1 }}
              className="not-italic italic font-normal text-primary relative bg-gradient-to-r from-transparent via-primary/50 to-transparent bg-bottom bg-no-repeat"
            >
              chính xác
            </motion.em>{" "}
            trong từng chi tiết
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-[16px] leading-[1.75] font-light text-muted-foreground max-w-[480px] mx-auto mb-11"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Thợ chất lượng, giá minh bạch và đặt lịch dễ dàng — tất cả trong một nền tảng chuyên nghiệp.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="max-w-[580px] mx-auto mb-12"
          >
            <div
              className="flex items-center gap-2.5 bg-card/80 backdrop-blur-md border border-border rounded-2xl p-[6px] pl-4
              shadow-lg shadow-primary/5 transition-all duration-300
              focus-within:border-primary/40 focus-within:shadow-primary/10"
            >
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                className="flex-1 bg-transparent border-none outline-none text-sm font-light text-foreground placeholder:text-muted-foreground/70"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
                placeholder="Bạn đang cần tìm dịch vụ gì?"
              />
              <Button size="sm" className="rounded-xl px-6 h-10 text-[13px] font-bold shadow-md shadow-primary/20">
                Tìm kiếm
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
                  className="relative flex items-center gap-2 text-[13px] text-muted-foreground px-5 py-2 cursor-default transition-colors
                  [&:not(:first-child)]:before:absolute [&:not(:first-child)]:before:left-0
                  [&:not(:first-child)]:before:top-1/2 [&:not(:first-child)]:before:-translate-y-1/2
                  [&:not(:first-child)]:before:h-3.5 [&:not(:first-child)]:before:w-px
                  [&:not(:first-child)]:before:bg-border/60"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <Icon className="w-4 h-4 text-primary shrink-0" strokeWidth={2} />
                  {label}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </motion.div>
    </Container>
  );
}