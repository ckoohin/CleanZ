'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Container from "@/components/Container";
import { useQuery } from '@tanstack/react-query';
import { adminServicesApi } from '@/features/admin/modules/service/services/admin-services.service';
import { useAuth } from '@/features/auth/hooks/auth.hooks';
import { BookingWizard } from '../components/wizard/BookingWizard';

// Mock service fallback just in case
const DUMMY_SERVICE = {
  id: "cleaning-standard",
  title: "Dịch vụ CleanZ",
};

// Hàm ánh xạ thông minh từ slug (dạng text public) sang UUID của dịch vụ thật trong database
const findServiceBySlug = (services: any[], slug: string) => {
  if (!services || services.length === 0) return null;
  const s = slug.toLowerCase();
  
  // 1. Tìm chính xác theo id (nếu slug truyền vào thực chất là UUID) hoặc serviceCode
  const exact = services.find(item => item.id === slug || item.serviceCode === slug);
  if (exact) return exact;
  
  // 2. Tìm theo từ khóa trong name
  if (s.includes("cleaning") || s.includes("don-dep") || s.includes("don-nha")) {
    const found = services.find(item => {
      const name = item.name.toLowerCase();
      return name.includes("dọn dẹp") || name.includes("dọn nhà");
    });
    if (found) return found;
  }
  if (s.includes("deep") || s.includes("tong-ve-sinh")) {
    const found = services.find(item => {
      const name = item.name.toLowerCase();
      return name.includes("tổng vệ sinh") || name.includes("chuyên sâu");
    });
    if (found) return found;
  }
  if (s.includes("sofa") || s.includes("nem") || s.includes("giat-sofa")) {
    const found = services.find(item => {
      const name = item.name.toLowerCase();
      return name.includes("sofa") || name.includes("nệm") || name.includes("đệm");
    });
    if (found) return found;
  }
  if (s.includes("curtain") || s.includes("rem") || s.includes("giat-rem")) {
    const found = services.find(item => {
      const name = item.name.toLowerCase();
      return name.includes("rèm");
    });
    if (found) return found;
  }
  if (s.includes("office") || s.includes("tap-vu")) {
    const found = services.find(item => {
      const name = item.name.toLowerCase();
      return name.includes("văn phòng") || name.includes("tạp vụ");
    });
    if (found) return found;
  }
  if (s.includes("glass") || s.includes("kinh") || s.includes("ve-sinh-kinh")) {
    const found = services.find(item => {
      const name = item.name.toLowerCase();
      return name.includes("kính");
    });
    if (found) return found;
  }

  // 3. Fallback tìm kiếm tương đối chứa slug
  const fuzzy = services.find(item => item.name.toLowerCase().includes(s));
  if (fuzzy) return fuzzy;

  // 4. Mặc định lấy dịch vụ đầu tiên hoạt động
  return services[0];
};

export default function ServiceBookingPage({ slug }: { slug?: string }) {
  const router = useRouter();
  const { data: user, isLoading: isAuthLoading } = useAuth();
  
  const { data: servicesData, isLoading: isServiceLoading } = useQuery({
    queryKey: ["services", "active-list-booking-page"],
    queryFn: () => adminServicesApi.getServices({ isActive: true, limit: 100 }),
    enabled: !!user,
  });

  const services = servicesData?.items || [];
  const serviceDetail = slug ? findServiceBySlug(services, slug) : null;

  useEffect(() => {
    if (!isAuthLoading && !user) {
      const currentUrl = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '';
      router.push(`/login?callbackUrl=${encodeURIComponent(currentUrl)}`);
    }
  }, [user, isAuthLoading, router]);

  if (isAuthLoading || isServiceLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground font-medium animate-pulse">
            {isAuthLoading ? "Đang xác thực tài khoản..." : "Đang tải thông tin dịch vụ..."}
          </p>
        </div>
      </div>
    );
  }

  // Nếu không tìm thấy dịch vụ nào trong DB
  if (services.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <h2 className="text-xl font-bold text-foreground mb-2">Chưa có dịch vụ nào hoạt động</h2>
        <p className="text-muted-foreground max-w-xs mb-6">Hệ thống hiện tại chưa có dịch vụ dọn dẹp nào được kích hoạt.</p>
        <Button onClick={() => router.push("/customer/home")} className="rounded-xl">Quay lại trang chủ</Button>
      </div>
    );
  }

  // Lấy chính xác UUID thật từ DB, hoặc dùng fallback an toàn
  const serviceId = serviceDetail?.id || services[0].id;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32 transition-colors duration-300 relative overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* 1. Header Navigation */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl border-b border-border/40 shadow-sm">
        <div className="w-full max-w-7xl mx-auto px-5 md:px-8 h-16 md:h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl hover:bg-muted">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex flex-col">
                 <h1 className="font-bold text-sm md:text-lg truncate max-w-[200px] md:max-w-[400px]">
                   {serviceDetail?.name || DUMMY_SERVICE.title}
                 </h1>
                 <p className="hidden md:flex items-center gap-1.5 text-[10px] text-primary uppercase tracking-widest font-black mt-0.5">
                   <Sparkles className="w-3 h-3" /> CleanZ Premium
                 </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
               <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hidden sm:flex font-bold px-3 py-1.5 rounded-lg">
                 Sẵn sàng phục vụ
               </Badge>
               <Button variant="outline" size="icon" className="rounded-xl border-border/60 text-muted-foreground">
                  <HelpCircle className="w-4 h-4" />
               </Button>
            </div>
        </div>
      </div>

      {/* 2. Main Content (Wizard) */}
      <main className="pt-0 md:pt-16 relative z-10 px-0">
         <Container classNameContent="px-0 md:px-8">
           <BookingWizard serviceId={serviceId} serviceDetail={serviceDetail} />
         </Container>
      </main>

      {/* Footer Branding */}
      <div className="fixed bottom-6 left-0 w-full text-center pointer-events-none opacity-40 z-0 hidden md:block">
        <span className="text-[100px] font-black tracking-tighter uppercase text-muted-foreground/10" style={{ fontFamily: "'Times New Roman', serif" }}>
          CLEANZ
        </span>
      </div>
    </div>
  );
}
