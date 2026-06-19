"use client";

import { motion } from "framer-motion";
import { slideInVariants, staggerContainerVariants } from "@/constants/motion";
import { ServiceListHorizontal } from "./ServiceListHorizontal";
import { Search, MapPin, Bell } from "lucide-react";
import { useRouter } from "next/navigation";

// Mock data
const mockServices = [
  {
    id: "srv-1",
    name: "Dọn dẹp nhà cửa",
    description: "Làm sạch toàn bộ phòng khách, phòng ngủ, bếp và toilet.",
    imageUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=600&auto=format&fit=crop",
    basePrice: 200000,
    ratingAvg: 4.8,
    durationHours: 2,
  },
  {
    id: "srv-2",
    name: "Vệ sinh máy lạnh",
    description: "Rửa lưới lọc, xịt rửa dàn lạnh, dàn nóng, bơm ga (nếu thiếu).",
    imageUrl: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?q=80&w=600&auto=format&fit=crop",
    basePrice: 150000,
    ratingAvg: 4.9,
    durationHours: 1,
  },
  {
    id: "srv-3",
    name: "Tổng vệ sinh sau xây dựng",
    description: "Tẩy sơn, lau kính, hút bụi sâu toàn bộ ngóc ngách nhà mới.",
    imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=600&auto=format&fit=crop",
    basePrice: 800000,
    ratingAvg: 4.7,
    durationHours: 6,
  },
  {
    id: "srv-4",
    name: "Giặt sofa & rèm cửa",
    description: "Hút bụi sâu, giặt bằng hơi nước nóng diệt khuẩn.",
    imageUrl: "https://images.unsplash.com/photo-1527772482340-fd8fbcc4bb7e?q=80&w=600&auto=format&fit=crop",
    basePrice: 350000,
    ratingAvg: 4.6,
    durationHours: 2,
  }
];

export const CatalogPage = () => {
  const router = useRouter();

  const handleSelectService = (id: string) => {
    // Navigate to booking wizard
    router.push(`/customer/booking?serviceId=${id}`);
  };

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
        <ServiceListHorizontal 
          title="Dịch vụ nổi bật" 
          services={mockServices} 
          onSelectService={handleSelectService} 
        />
        
        <ServiceListHorizontal 
          title="Dọn dẹp chuyên sâu" 
          services={mockServices.slice(2, 4)} 
          onSelectService={handleSelectService} 
        />
      </div>
    </div>
  );
};
