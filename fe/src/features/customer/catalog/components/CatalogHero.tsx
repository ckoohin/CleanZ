"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { fadeUpVariants } from "@/constants/motion";

export const CatalogHero = () => {
  return (
    <section className="relative overflow-hidden px-4 pt-4 pb-2 md:pt-6 md:pb-3">
      {/* Background decorations */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        {/* Radial glow top-right */}
        <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        {/* Radial glow bottom-left */}
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
      </div>

      <motion.div
        variants={fadeUpVariants}
        initial="hidden"
        animate="visible"
        className="max-w-xl"
      >
        {/* Label badge */}
        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          Dịch vụ dọn dẹp chuyên nghiệp
        </span>

        {/* Heading */}
        <h1 className="mt-1 font-sans text-xl font-extrabold leading-tight text-foreground md:text-2xl">
          Không gian sạch sẽ,{" "}
          <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
            tâm trí thư thái
          </span>
        </h1>

        {/* Subtext */}
        <p className="mt-1 text-xs text-muted-foreground/80 leading-relaxed md:text-sm">
          Chọn dịch vụ phù hợp và đặt lịch chỉ trong vài giây — chúng tôi lo phần còn lại.
        </p>
      </motion.div>
    </section>
  );
};
