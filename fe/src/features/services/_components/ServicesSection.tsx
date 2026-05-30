import React from "react";
import { motion, Variants } from "motion/react";
import { Button } from "@/components/ui/button";
import { Star, Clock, ArrowRight, CalendarCheck } from "lucide-react";
import { headingVariants } from "../motions/service.motion";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import ServiceCard from "@/features/services/_components/ServiceCard";
import Container from "@/components/Container";
import { cn } from "@/lib/utils";
import { ServiceItem } from "@/features/home/types/service.type";

interface ServicesSectionProps {
  title?: string;
  subtitle?: string;
  services: ServiceItem[];
  viewAllHref?: string;
  className?: string;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  title = "Dịch vụ nổi bật",
  subtitle = "Chuyên viên được tuyển chọn kỹ càng dựa trên hoạt động của bạn.",
  services,
  viewAllHref = "/services",
  className,
}) => {
  return (
    <>
      <Container
        classNameContent="px-4"
        className={cn("scrollbar-hide", className)}>
        <motion.div
          className="flex items-end justify-between px-2 mb-5 sm:mb-10"
          variants={headingVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
        >
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-1">{title}</h2>
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          </div>
          <Button variant="ghost" className="text-primary font-semibold gap-1 group shrink-0" asChild>
            <a href={viewAllHref}>
              Xem tất cả
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </Button>
        </motion.div>

        <div className="w-full flex justify-center">
          <Carousel
            opts={{
              align: "start",
            }}
            className="w-full"
          >
            <CarouselContent>
              {services.map((s, i) => (
                <CarouselItem key={s.id} className="basis-1/1 sm:basis-1/2 lg:basis-1/3 xl:basis-1/4" >
                  <div className="p-1">
                    <ServiceCard key={s.id} service={s} index={i} />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </Container>

    </>
  );
};
