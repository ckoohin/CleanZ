import React from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { CalendarCheck, ChevronRight } from "lucide-react";
import { CtaSectionProps } from "../types/ctaSection.type";
import Container from "@/components/Container";

export const CtaSection: React.FC<CtaSectionProps> = ({
  title = "Sẵn sàng tìm chuyên viên hoàn hảo?",
  subtitle = "Hơn 50.000 gia đình tin tưởng CleanZ cho nhu cầu hàng ngày của họ.",
  primaryLabel = "Đặt dịch vụ ngay",
  primaryHref = "/services",
  secondaryLabel = "Xem bảng giá",
  secondaryHref = "/pricing",
  image = "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1000&q=80",
  stat = "50.000+",
  className,
}) => {
  return (
    <Container className={className}>
        <motion.div
          className="bg-[#0D1B3E] dark:bg-[#060E24] rounded-3xl p-10 md:p-14 relative overflow-hidden"
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Decorative tints */}
          <div className="pointer-events-none absolute inset-0 bg-primary/5" />
          <div className="pointer-events-none absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/10 to-transparent" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.15 }}
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 text-white/80 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {stat} gia đình tin tưởng
              </div>

              <h2 className="text-white text-4xl md:text-5xl font-bold leading-tight mb-4">
                {title}
              </h2>
              <p className="text-white/50 text-base mb-8 max-w-md leading-relaxed">
                {subtitle}
              </p>

              <div className="flex flex-wrap gap-3">
                {/* Primary button — vàng KOS */}
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-7 py-5 rounded-xl gap-2 group"
                  asChild
                >
                  <a href={primaryHref}>
                    <CalendarCheck className="w-4 h-4" />
                    {primaryLabel}
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </Button>

                {/* Secondary button — outline trắng */}
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 hover:text-white font-semibold px-7 py-5 rounded-xl bg-transparent"
                  asChild
                >
                  <a href={secondaryHref}>{secondaryLabel}</a>
                </Button>
              </div>
            </motion.div>

            <motion.div
              className="hidden md:block relative h-72"
              initial={{ opacity: 0, x: 24, scale: 0.97 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <img
                src={image}
                alt="CleanZ app"
                className="w-full h-full object-cover rounded-2xl"
                loading="lazy"
              />
              {/* Rating badge */}
              <div className="absolute bottom-4 left-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3">
                <p className="text-white text-sm font-bold">
                  <span className="text-primary">★</span> 4.9 / 5
                </p>
                <p className="text-white/60 text-xs">Đánh giá trung bình</p>
              </div>
            </motion.div>
          </div>
        </motion.div>
    </Container>
  );
};
