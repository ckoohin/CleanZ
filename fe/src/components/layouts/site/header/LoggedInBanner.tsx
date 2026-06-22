"use client";

import React, { useState, useEffect } from "react";
import { useProfile } from "@/features/auth/hooks/auth.hooks";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const LoggedInBanner = () => {
  const { data: profile } = useProfile();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (profile) {
      // Kiểm tra xem user này đã tắt banner trước đó chưa
      const isClosed = localStorage.getItem(`closed-welcome-banner-${profile.id}`);
      if (isClosed === "true") {
        return;
      }

      // Delay slightly so it pops up naturally after page load
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [profile]);

  if (!profile) return null;

  // Determine the correct dashboard route based on role
  let dashboardRoute = "/customer";
  if (profile.role === "TASKER") dashboardRoute = "/tasker";
  if (profile.role === "ADMIN") dashboardRoute = "/admin";

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem(`closed-welcome-banner-${profile.id}`, "true");
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-sm sm:max-w-md"
        >
          <div className="bg-background/80 backdrop-blur-xl border border-border shadow-2xl p-4 sm:p-5 rounded-[1.5rem] relative overflow-hidden flex flex-col sm:flex-row items-center gap-4">
            {/* Decor */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[40px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />
            
            <button 
              onClick={handleClose}
              className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-full transition-colors z-10"
              aria-label="Đóng"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
              <Sparkles className="w-6 h-6" />
            </div>

            <div className="flex-1 text-center sm:text-left z-10">
              <h4 className="text-sm font-bold text-foreground mb-1 leading-tight">
                Chào mừng trở lại!
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed pr-2">
                Sẵn sàng đặt dịch vụ và dọn dẹp nhà cửa ngay hôm nay?
              </p>
            </div>

            <div className="w-full sm:w-auto z-10 mt-2 sm:mt-0">
              <Button asChild onClick={handleClose} size="sm" className="w-full sm:w-auto rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all px-4 h-10">
                <Link href={dashboardRoute}>
                  Vào ngay <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
