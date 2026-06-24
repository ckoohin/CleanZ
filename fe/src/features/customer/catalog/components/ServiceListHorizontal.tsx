"use client";

import { motion } from "framer-motion";
import { staggerContainerVariants } from "@/constants/motion";
import { ServiceCard } from "./ServiceCard";

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  durationHours: number;
  coverageArea?: string | null;
}

interface Props {
  title: string;
  services: ServiceItem[];
  onSelectService: (id: string) => void;
}

export const ServiceListHorizontal = ({
  title,
  services,
  onSelectService,
}: Props) => {
  return (
    <section className="px-4 py-6">
      <h2 className="text-2xl font-bold mb-5">
        {title}
      </h2>

      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
        className="
          grid
          grid-cols-1
          sm:grid-cols-2
          xl:grid-cols-3
          gap-4
        "
      >
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            {...service}
            onSelect={onSelectService}
          />
        ))}
      </motion.div>
    </section>
  );
};