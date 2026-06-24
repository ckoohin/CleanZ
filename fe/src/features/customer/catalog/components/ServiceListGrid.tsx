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
}

interface ServiceListGridProps {
  services: ServiceGridItem[];
  onSelectService: (id: string) => void;
}

export const ServiceListGrid = ({
  services,
  onSelectService,
}: ServiceListGridProps) => {
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
    >
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          {...service}
          onSelect={onSelectService}
        />
      ))}
    </motion.div>
  );
};
