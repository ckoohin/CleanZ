"use client"

import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { TrendingUp, LucideIcon } from "lucide-react";

/**
 * PremiumStatsCard - Demo component tuân thủ king-of-service-frontend skill
 * 
 * Features:
 * - Hỗ trợ cn() và className để tùy biến toàn diện.
 * - Responsive: Tự điều chỉnh padding và font-size (sm -> 2xl).
 * - Thẩm mỹ: Glassmorphism, bo góc lớn (3rem), Serif font.
 */

interface PremiumStatsCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  trend?: string;
  className?: string;       // Custom lớp bao ngoài
  iconClassName?: string;    // Custom lớp icon
  textClassName?: string;    // Custom lớp văn bản
}

export const PremiumStatsCard = ({ 
  title, 
  value, 
  subValue, 
  icon: Icon, 
  trend,
  className,
  iconClassName,
  textClassName
}: PremiumStatsCardProps) => {
  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
      className={cn(
        // Base Layout: Mobile first
        "relative group overflow-hidden p-6 md:p-8 flex flex-col gap-4",
        // Responsive Radius: Bo góc cực lớn chuẩn CleanZ
        "rounded-[2.5rem] md:rounded-[3.5rem]",
        // Design: Glassmorphism phong cách Premium
        "bg-card/40 backdrop-blur-xl border border-border/40 shadow-xl shadow-primary/5",
        // Customization
        className
      )}
    >
      {/* Decorative Blur - Tạo chiều sâu (Background Depth) */}
      <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-primary/10 rounded-full blur-[80px] group-hover:bg-primary/20 transition-all duration-500" />

      {/* Header: Icon & Trend */}
      <div className="flex items-center justify-between relative z-10">
        <div className={cn(
          "w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl flex items-center justify-center transition-all duration-500",
          "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:rotate-6",
          iconClassName
        )}>
          <Icon className="w-6 h-6 md:w-8 md:h-8" />
        </div>
        
        {trend && (
           <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full">
              <TrendingUp className="w-3 h-3 md:w-4 h-4" />
              <span className="text-[10px] md:text-xs font-black tracking-tight">{trend}</span>
           </div>
        )}
      </div>

      {/* Body: Value & Title */}
      <div className={cn("space-y-1 md:space-y-2 relative z-10", textClassName)}>
        <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.25em] text-muted-foreground/60">
          {title}
        </p>
        <div className="flex items-baseline gap-2">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter transition-colors group-hover:text-primary leading-tight">
            {value}
          </h2>
          {subValue && (
            <span className="text-sm md:text-lg font-serif italic text-muted-foreground font-light">
              {subValue}
            </span >
          )}
        </div>
      </div>

      {/* Footer Decoration: Thêm font Serif cho sự sang trọng */}
      <div className="pt-2 md:pt-4 border-t border-border/10">
         <p className="text-[9px] md:text-[11px] font-serif italic opacity-40 text-muted-foreground group-hover:opacity-60 transition-opacity">
           Dữ liệu được cập nhật theo thời gian thực từ hệ thống CleanZ
         </p>
      </div>
    </motion.div>
  );
};
