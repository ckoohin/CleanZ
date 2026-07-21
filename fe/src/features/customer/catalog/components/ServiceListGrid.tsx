"use client";

import { motion } from "framer-motion";
import { staggerContainerVariants } from "@/constants/motion";
import { ServiceCard } from "./ServiceCard";

export interface ServiceGridItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  peakPrice?: number | null;
  durationHours: number;
  coverageArea?: string | null;
  pricingType?: string;
  hasPetFee?: boolean;
  hasPeakPrice?: boolean;
  subServiceNames?: string[];
  rating?: number;
  reviewsCount?: number;
  isPopular?: boolean;
  hasPromo?: boolean;
}

interface ServiceListGridProps {
  services: ServiceGridItem[];
  onViewDetail: (id: string) => void;
  onBookNow: (id: string) => void;
}

export const ServiceListGrid = ({
  services,
  onViewDetail,
  onBookNow,
}: ServiceListGridProps) => {
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5"
    >
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          {...service}
          onViewDetail={onViewDetail}
          onBookNow={onBookNow}
        />
      ))}
    </motion.div>
  );
};
