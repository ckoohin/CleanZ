"use client";

import * as React from "react";
import { LucideIcon } from "lucide-react";
import { ServiceCard } from "./ServiceCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface ServiceItem {
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

interface Props {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColorClass?: string;
  services: ServiceItem[];
  onViewDetail: (id: string) => void;
  onBookNow: (id: string) => void;
}

export const ServiceHorizontalScroll = ({
  title,
  subtitle,
  icon: Icon,
  iconColorClass = "text-primary",
  services,
  onViewDetail,
  onBookNow,
}: Props) => {
  if (!services || services.length === 0) return null;

  return (
    <section className="py-4 border-b border-border/20 last:border-0 relative">
      <div className="flex flex-col mb-4">
        <h2 className="text-base font-extrabold text-foreground/90 flex items-center gap-1.5 leading-none">
          <Icon className={`w-4 h-4 shrink-0 ${iconColorClass}`} />
          {title}
        </h2>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground/60 mt-1 select-none">
            {subtitle}
          </p>
        )}
      </div>

      <div className="relative px-0.5">
        <Carousel
          opts={{
            align: "start",
            containScroll: "trimSnaps",
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4 pb-2">
            {services.map((service) => (
              <CarouselItem
                key={service.id}
                className="pl-4 basis-[280px] sm:basis-[320px] shrink-0"
              >
                <div className="h-full select-none">
                  <ServiceCard
                    {...service}
                    onViewDetail={onViewDetail}
                    onBookNow={onBookNow}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          
          {/* Nút điều hướng chỉ hiện trên màn hình desktop */}
          <div className="hidden md:block">
            <CarouselPrevious className="absolute -left-4 top-1/2 -translate-y-1/2 bg-background hover:bg-muted shadow-md border-border/60" />
            <CarouselNext className="absolute -right-4 top-1/2 -translate-y-1/2 bg-background hover:bg-muted shadow-md border-border/60" />
          </div>
        </Carousel>
      </div>
    </section>
  );
};
