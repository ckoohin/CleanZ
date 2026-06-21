"use client";

import { motion } from "framer-motion";
import { staggerContainerVariants } from "@/constants/motion";
import { ServiceCard } from "./ServiceCard";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  ratingAvg: number;
  durationHours: number;
}

interface ServiceListHorizontalProps {
  title: string;
  services: ServiceItem[];
  onSelectService: (id: string) => void;
}

export const ServiceListHorizontal = ({
  title,
  services,
  onSelectService,
}: ServiceListHorizontalProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.8;
      scrollRef.current.scrollTo({
        left: direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between mb-4 px-4 md:px-0">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">{title}</h2>
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            className="p-2 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="p-2 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar px-4 md:px-0 pb-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {services.map((service) => (
          <div key={service.id} className="snap-start">
            <ServiceCard {...service} onSelect={onSelectService} />
          </div>
        ))}
      </motion.div>
    </div>
  );
};
