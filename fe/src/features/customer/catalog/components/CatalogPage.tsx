"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { slideInVariants } from "@/constants/motion";
import { ServiceListHorizontal } from "./ServiceListHorizontal";
import { Search, MapPin, Bell, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { adminServicesApi } from "@/features/admin/services/admin-services.service";
import { ServiceDetailModal } from "@/features/services/_components/ServiceDetailModal";
import { PublicService } from "@/features/public/hooks/usePublicData";

export const CatalogPage = () => {
  const router = useRouter();
  const [selectedService, setSelectedService] = useState<PublicService | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["services", "customer-active-list"],
    queryFn: () => adminServicesApi.getServices({ isActive: true, limit: 100 }),
  });

  const handleSelectService = (id: string) => {
    const originalItem = data?.items?.find((item) => item.id === id);
    if (originalItem) {
      const mappedPublicService: PublicService = {
        id: originalItem.id,
        name: originalItem.name,
        categoryId: originalItem.categoryId || "",
        description: originalItem.description || "",
        thumbnailUrl: originalItem.thumbnailUrl || undefined,
        galleryUrls: originalItem.galleryUrls || undefined,
        shortDescription: originalItem.shortDescription || undefined,
        includedTasks: originalItem.includedTasks || undefined,
        excludedTasks: originalItem.excludedTasks || undefined,
        baseDurationHours: originalItem.baseDurationHours || undefined,
        basePrice: originalItem.pricingConfig ? Number(originalItem.pricingConfig.basePrice) : undefined,
      };
      setSelectedService(mappedPublicService);
      setIsModalOpen(true);
    }
  };

  const services = data?.items?.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.shortDescription || item.description || "Dịch vụ vệ sinh CleanZ chất lượng cao.",
    imageUrl: item.thumbnailUrl || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=600&auto=format&fit=crop",
    basePrice: item.pricingConfig ? Number(item.pricingConfig.basePrice) : 200000,
    ratingAvg: 4.9,
    durationHours: item.baseDurationHours || 2,
    coverageArea: item.coverageArea || "",
  })) || [];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <motion.div 
        variants={slideInVariants}
        initial="hidden"
        animate="visible"
        className="bg-card px-4 pt-12 pb-6 shadow-sm rounded-b-3xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <span className="text-xl font-bold text-primary">C</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Xin chào,</p>
              <h1 className="text-lg font-bold text-foreground">Khách hàng</h1>
            </div>
          </div>
          <button className="p-2.5 rounded-full bg-background hover:bg-muted transition-colors relative">
            <Bell className="w-6 h-6 text-muted-foreground" />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
        </div>

        {/* Current Location Quick Action */}
        <div className="flex items-center gap-2 mb-4 text-sm bg-background p-3 rounded-xl border border-border/50 cursor-pointer hover:border-border transition-colors">
          <MapPin className="w-5 h-5 text-primary" />
          <span className="text-muted-foreground truncate flex-1">Giao đến: <span className="font-semibold text-foreground">Chọn địa chỉ của bạn...</span></span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/80" />
          <input 
            type="text" 
            placeholder="Bạn đang tìm dịch vụ gì?" 
            className="w-full bg-muted/80 border-none rounded-2xl py-4 pl-12 pr-4 text-foreground/90 placeholder:text-muted-foreground/80 focus:ring-2 focus:ring-primary/20 focus:bg-card transition-all outline-none"
          />
        </div>
      </motion.div>

      {/* Content */}
      <div className="mt-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground font-medium animate-pulse">Đang tải danh sách dịch vụ...</p>
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-20 px-4">
            <Sparkles className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="font-bold text-base text-foreground">Chưa có dịch vụ nào hoạt động</h3>
            <p className="text-sm text-muted-foreground mt-1">Vui lòng quay lại sau hoặc liên hệ quản trị viên.</p>
          </div>
        ) : (
          <>
            <ServiceListHorizontal 
              title="Dịch vụ nổi bật" 
              services={services} 
              onSelectService={handleSelectService} 
            />
            
            {services.length > 2 && (
              <ServiceListHorizontal 
                title="Dịch vụ nâng cao" 
                services={services.slice(2)} 
                onSelectService={handleSelectService} 
              />
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      <ServiceDetailModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        service={selectedService} 
      />
    </div>
  );
};
