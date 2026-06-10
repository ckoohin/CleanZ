'use client';

import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Home, Wrench } from 'lucide-react';
import LogoApp from "@/components/logo/LogoApp";

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
      <body className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
           <div className="absolute top-0 right-0 md:top-0 md:right-0 w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-red-500/10 rounded-full blur-[80px] md:blur-[150px] animate-pulse" />
           <div className="absolute bottom-0 left-0 md:bottom-0 md:left-0 w-[250px] h-[250px] md:w-[500px] md:h-[500px] bg-primary/10 rounded-full blur-[80px] md:blur-[120px]" />
        </div>

        <div className="w-full max-w-2xl relative z-10 flex flex-col items-center text-center">
          
          <div className="mb-8 md:mb-10">
            <LogoApp size="lg" textClassName="text-white" />
          </div>

          <div className="bg-black/60 md:bg-black/40 backdrop-blur-xl md:backdrop-blur-2xl border border-red-500/20 p-6 sm:p-8 md:p-12 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full mx-auto relative overflow-hidden">
            {/* Accent decoration */}
            <div className="absolute -top-10 -right-10 md:-top-16 md:-right-16 opacity-5 rotate-12">
               <AlertTriangle className="w-48 h-48 md:w-64 md:h-64 text-red-500" />
            </div>

            <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-red-500/10 rounded-2xl md:rounded-3xl mx-auto flex items-center justify-center text-red-500 mb-6 md:mb-8 shadow-lg shadow-red-500/10 border border-red-500/20">
               <Wrench className="w-7 h-7 md:w-10 md:h-10 animate-pulse" />
            </div>

            <div className="space-y-3 md:space-y-4 relative z-10">
               <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">
                 Hệ thống gặp sự cố!
               </h1>
               <p className="text-slate-300 font-medium text-xs sm:text-sm md:text-base max-w-md mx-auto leading-relaxed px-2 sm:px-0">
                 Chúng tôi vô cùng xin lỗi vì sự bất tiện này. Một lỗi kỹ thuật vừa xảy ra và các chuyên gia CleanZ đã được thông báo để xử lý ngay lập tức.
               </p>
               
               {error?.digest && (
                  <div className="bg-red-500/10 border border-red-500/20 py-2 px-3 md:px-4 rounded-xl inline-flex items-center mt-3 md:mt-4 max-w-full overflow-hidden">
                    <span className="text-[10px] md:text-[11px] font-bold uppercase text-red-400 tracking-widest leading-none truncate">
                      Mã lỗi: {error.digest}
                    </span>
                  </div>
               )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 pt-8 md:pt-10 relative z-10">
              <Button 
                  onClick={() => reset()}
                  className="w-full sm:w-auto h-12 md:h-14 px-6 md:px-8 rounded-xl md:rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs md:text-sm tracking-wide gap-2 shadow-lg shadow-red-600/20 transition-all"
              >
                <RotateCcw className="w-4 h-4 md:w-5 md:h-5" /> Thử lại ngay
              </Button>
              <Button 
                  variant="outline" 
                  onClick={() => window.location.href = "/"}
                  className="w-full sm:w-auto h-12 md:h-14 px-6 md:px-8 rounded-xl md:rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 hover:text-white text-slate-300 font-bold text-xs md:text-sm tracking-wide gap-2 transition-all"
              >
                <Home className="w-4 h-4 md:w-5 md:h-5" /> Về trang chủ
              </Button>
            </div>
          </div>

          <div className="mt-10 md:mt-12 opacity-30 text-[9px] md:text-[10px] font-black tracking-[0.2em] md:tracking-[0.3em] uppercase px-4">
            CleanZ Global Safety Layer
          </div>
        </div>
      </body>
    </html>
  );
}
