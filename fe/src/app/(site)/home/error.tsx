'use client';

import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw, Home, Sparkles } from 'lucide-react';
import Container from '@/components/Container';
import Link from 'next/link';

export default function HomeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <Container>
        <div className="max-w-2xl mx-auto text-center space-y-10 py-12 px-8 bg-card/40 backdrop-blur-xl border border-border/40 rounded-[3rem] shadow-2xl relative overflow-hidden">
          {/* Decorative element */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 space-y-6">
            <div className="w-20 h-20 bg-amber-500/10 rounded-3xl mx-auto flex items-center justify-center text-amber-500 animate-pulse">
               <AlertCircle className="w-10 h-10" />
            </div>

            <div className="space-y-3">
               <h2 className="text-3xl md:text-5xl font-light" style={{ fontFamily: "'Playfair Display', serif" }}>
                 Không thể tải <span className="italic text-primary">trang chủ</span>
               </h2>
               <p className="text-muted-foreground font-light text-lg max-w-lg mx-auto leading-relaxed">
                 Đã có một sự cố nhỏ khi hiển thị danh sách dịch vụ. Đừng lo lắng, dữ liệu của bạn vẫn an toàn. Hãy thử làm mới lại trang.
               </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button 
                onClick={() => reset()}
                className="h-14 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs tracking-widest gap-2 shadow-xl shadow-primary/20 transition-all hover:scale-105"
              >
                <RotateCcw className="w-4 h-4" /> Thử lại trang chủ
              </Button>
              <Button 
                variant="outline" 
                asChild
                className="h-14 px-10 rounded-2xl border-border/60 font-black uppercase text-xs tracking-widest gap-2 bg-background/50"
              >
                <Link href="/services">
                   Xem các dịch vụ khác
                </Link>
              </Button>
            </div>
          </div>

          <div className="pt-8 flex items-center justify-center gap-4 opacity-40">
             <Sparkles className="w-4 h-4 text-primary" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em]">CleanZ Recovery Mode</span>
          </div>
        </div>
      </Container>
    </div>
  );
}
