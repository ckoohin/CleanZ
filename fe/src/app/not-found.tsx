'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search, Sparkles } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
         <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
         <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      <div className="max-w-2xl w-full text-center space-y-12 relative z-10">
        <div className="relative inline-block">
          <motion.h1 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-[12rem] md:text-[18rem] font-black leading-none tracking-tighter text-muted/10 italic"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            404
          </motion.h1>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="absolute inset-0 flex items-center justify-center"
          >
             <div className="bg-background/40 backdrop-blur-xl border border-white/20 p-8 md:p-12 rounded-[3.5rem] shadow-2xl space-y-6">
                <div className="w-20 h-20 bg-primary/10 rounded-3xl mx-auto flex items-center justify-center text-primary group animate-bounce">
                   <Search className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                   <h2 className="text-3xl md:text-5xl font-light" style={{ fontFamily: "'Playfair Display', serif" }}>
                     Trang bạn tìm <span className="italic text-primary">không tồn tại</span>
                   </h2>
                   <p className="text-muted-foreground font-light text-lg max-w-md mx-auto">
                     Có vẻ như dịch vụ này đã "bay màu" hoặc đường dẫn đã thay đổi. Đừng lo, các chuyên gia của chúng tôi đang ở ngay đây!
                   </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <Button asChild className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs tracking-widest gap-2 shadow-xl shadow-primary/20">
                    <Link href="/">
                      <Home className="w-4 h-4" /> Về trang chủ
                    </Link>
                  </Button>
                  <Button variant="outline" onClick={() => window.history.back()} className="h-14 px-8 rounded-2xl border-border/40 hover:bg-muted/50 font-black uppercase text-xs tracking-widest gap-2">
                    <ArrowLeft className="w-4 h-4" /> Quay lại
                  </Button>
                </div>
             </div>
          </motion.div>
        </div>

        <div className="flex items-center justify-center gap-8 opacity-40">
           <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">KingOfService</span>
           </div>
           <div className="w-1 h-1 bg-muted-foreground rounded-full" />
           <span className="text-[10px] font-black uppercase tracking-widest">Premium Care</span>
        </div>
      </div>
    </div>
  );
}
