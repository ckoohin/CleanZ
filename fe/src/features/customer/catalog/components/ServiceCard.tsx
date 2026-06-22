"use client";

import { motion } from "framer-motion";
import { Star, Clock, MapPin } from "lucide-react";
import { zoomInVariants } from "@/constants/motion";

interface ServiceCardProps {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  ratingAvg: number;
  durationHours: number;
  coverageArea?: string;
  onSelect: (id: string) => void;
}

export const ServiceCard = ({
  id,
  name,
  description,
  imageUrl,
  basePrice,
  ratingAvg,
  durationHours,
  coverageArea,
  onSelect,
}: ServiceCardProps) => {
  return (
    <motion.div
      variants={zoomInVariants}
      whileHover={{ y: -5 }}
      onClick={() => onSelect(id)}
      className="flex-shrink-0 w-72 md:w-80 bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-border/50 cursor-pointer transition-shadow"
    >
      <div className="relative h-40 w-full bg-muted/80">
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
          <span className="text-xs font-semibold text-foreground/90">{ratingAvg.toFixed(1)}</span>
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-foreground text-lg line-clamp-1">{name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{description}</p>
        </div>
        
        <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-muted-foreground/80" />
            <span>~{durationHours} giờ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-muted-foreground/80" />
            <span className="truncate max-w-[150px]">{coverageArea || "Tại nhà"}</span>
          </div>
        </div>
        
        <div className="pt-3 border-t border-border/50 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Giá từ</p>
          <p className="font-bold text-primary text-lg">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(basePrice)}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
