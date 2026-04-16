'use client';

import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-xl w-full text-center space-y-8 bg-card border border-border/40 p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
          {/* Accent decoration */}
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <AlertCircle className="w-40 h-40" />
          </div>

          <div className="w-20 h-20 bg-destructive/10 rounded-3xl mx-auto flex items-center justify-center text-destructive">
             <AlertCircle className="w-10 h-10" />
          </div>

          <div className="space-y-4 relative z-10">
             <h1 className="text-4xl font-light" style={{ fontFamily: "'Playfair Display', serif" }}>
               Hệ thống gặp <span className="italic text-destructive">sự cố bất ngờ</span>
             </h1>
             <p className="text-muted-foreground font-light text-lg">
               Chúng tôi vô cùng xin lỗi vì sự bất tiện này. Các chuyên viên kỹ thuật đã được thông báo để xử lý ngay lập tức.
             </p>
             {error?.digest && (
                <div className="bg-muted py-2 px-4 rounded-xl inline-block">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none">Mã lỗi: {error.digest}</span>
                </div>
             )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <Button 
                onClick={() => reset()}
                className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs tracking-widest gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Thử lại ngay
            </Button>
            <Button 
                variant="outline" 
                onClick={() => window.location.href = "/"}
                className="h-14 px-8 rounded-2xl border-border/40 font-black uppercase text-xs tracking-widest gap-2"
            >
              <Home className="w-4 h-4" /> Về trang chủ
            </Button>
          </div>

          <p className="text-[10px] uppercase font-black tracking-[0.2em] opacity-30">
            KingOfService Global Safety Layer
          </p>
        </div>
      </body>
    </html>
  );
}
