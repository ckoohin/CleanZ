'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Map } from 'lucide-react';
import LogoApp from "@/components/logo/LogoApp";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Decor - Deep & Premium */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
         <div className="absolute top-0 right-0 md:top-1/4 md:left-1/4 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-primary/20 rounded-full blur-[80px] md:blur-[120px] animate-pulse" />
         <div className="absolute bottom-0 left-0 md:bottom-1/4 md:right-1/4 w-[400px] h-[400px] md:w-[600px] md:h-[600px] bg-blue-500/10 rounded-full blur-[100px] md:blur-[150px] animate-pulse delay-1000" />
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] md:w-[800px] md:h-[800px] bg-slate-900 rounded-full blur-[80px] md:blur-[100px] -z-10" />
      </div>

      <div className="w-full max-w-4xl relative z-10 flex flex-col items-center text-center">
        {/* Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8 md:mb-12"
        >
          <LogoApp size="lg" textClassName="text-white" />
        </motion.div>

        {/* 404 Text - Bold and Impressive */}
        <motion.h1 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
          className="text-[8rem] sm:text-[12rem] md:text-[18rem] lg:text-[20rem] font-black leading-none tracking-tighter bg-gradient-to-b from-white/20 to-white/5 bg-clip-text text-transparent select-none mb-[-3rem] sm:mb-[-5rem] md:mb-[-8rem] relative z-0"
        >
          404
        </motion.h1>
        
        {/* Floating Card - Premium Glassmorphism */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
          className="relative z-10 w-full max-w-xl mx-auto px-2 sm:px-4"
        >
           <div className="bg-black/60 md:bg-black/40 backdrop-blur-xl md:backdrop-blur-2xl border border-white/10 p-6 sm:p-8 md:p-12 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full">
              <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-primary/20 rounded-2xl md:rounded-3xl mx-auto flex items-center justify-center text-primary mb-6 shadow-lg shadow-primary/20 border border-primary/30">
                 <Map className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10" />
              </div>
              
              <h2 className="text-xl sm:text-2xl md:text-4xl font-extrabold mb-3 md:mb-4 tracking-tight">
                Lạc đường rồi! <br className="hidden sm:block" />
                <span className="text-primary font-medium text-lg sm:text-xl md:text-2xl mt-1 block sm:inline">Trang này không tồn tại</span>
              </h2>
              
              <p className="text-slate-300 text-xs sm:text-sm md:text-base font-medium max-w-md mx-auto mb-6 md:mb-8 leading-relaxed px-2 sm:px-0">
                Có vẻ như dịch vụ này đã dọn dẹp sạch sẽ hoặc đường dẫn không chính xác. Đừng lo, hãy để chúng tôi đưa bạn về nhà!
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
                <Button asChild className="w-full sm:w-auto h-12 md:h-14 px-6 md:px-8 rounded-xl md:rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-xs md:text-sm tracking-wide shadow-lg shadow-primary/20 transition-all">
                  <Link href="/">
                    <Home className="w-4 h-4 md:w-5 md:h-5 mr-2" /> Về trang chủ
                  </Link>
                </Button>
                <Button variant="outline" onClick={() => window.history.back()} className="w-full sm:w-auto h-12 md:h-14 px-6 md:px-8 rounded-xl md:rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 hover:text-white text-slate-300 font-bold text-xs md:text-sm tracking-wide transition-all">
                  <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 mr-2" /> Quay lại
                </Button>
              </div>
           </div>
        </motion.div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 md:mt-20 opacity-40 text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase px-4"
        >
          CleanZ • Premium Care Service
        </motion.div>
      </div>
    </div>
  );
}
