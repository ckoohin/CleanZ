import React from "react";
import { motion, Variants } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, Clock, ArrowRight, CalendarCheck } from "lucide-react";
import { ServiceCardProps, ServicesSectionProps } from "../types/service.type";
import { BookingStepper } from "@/features/services/_components/BookingStepper";
import { ServiceItem } from "@/features/home/types/service.type";

const headingVariants: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const cardVariants: Variants = {
  hidden:  { opacity: 0, y: 36, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.5, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const ServiceCard: React.FC<ServiceCardProps & { index: number, onBook: (service: ServiceItem) => void }> = ({ service: s, index, onBook }) => (
  <motion.div
    custom={index}
    variants={cardVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: "-40px" }}
  >
    <Card className="group overflow-hidden border border-border hover:shadow-xl hover:border-primary/20 transition-all duration-300 flex flex-col h-full">
      <div className="relative h-56 overflow-hidden shrink-0">
        <img
          src={s.image}
          alt={s.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold text-foreground flex items-center gap-1 border border-border/50">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          {s.rating}
          <span className="text-muted-foreground">({s.reviews})</span>
        </div>

        <div className="absolute bottom-3 left-3">
          <Badge variant="secondary" className="text-[10px] uppercase tracking-widest font-bold">
            {s.tag}
          </Badge>
        </div>
      </div>

      <CardContent className="p-5 flex-1 flex flex-col gap-2">
        <h3 className="font-bold text-base text-foreground leading-snug">{s.title}</h3>
        <p className="text-muted-foreground text-sm line-clamp-2 flex-1 leading-relaxed">
          {s.desc}
        </p>

        <Separator className="my-2" />

        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-foreground">{s.price}</span>
            <span className="text-muted-foreground text-xs">{s.unit}</span>
          </div>
          <span className="flex items-center gap-1 text-muted-foreground text-xs">
            <Clock className="w-3.5 h-3.5" />
            {s.duration}
          </span>
        </div>

        <Button
          className="w-full mt-1 font-semibold gap-2 rounded-xl"
          size="sm"
          onClick={() => onBook(s)}
        >
          <CalendarCheck className="w-3.5 h-3.5" />
          Đặt ngay
        </Button>
      </CardContent>
    </Card>
  </motion.div>
);

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  title    = "Dịch vụ nổi bật",
  subtitle = "Chuyên viên được tuyển chọn kỹ càng dựa trên hoạt động của bạn.",
  services,
  viewAllHref = "/services",
  className,
}) => {
  const [bookingModalOpen, React_setBookingModalOpen] = React.useState(false);
  const [selectedService, React_setSelectedService] = React.useState<ServiceItem | null>(null);

  const handleBook = (service: ServiceItem) => {
    React_setSelectedService(service);
    React_setBookingModalOpen(true);
  };

  return (
    <section className={className}>
      <motion.div
        className="flex items-end justify-between mb-10"
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {services.map((s, i) => (
          <ServiceCard key={s.id} service={s} index={i} onBook={handleBook} />
        ))}
      </div>

      <BookingStepper 
        open={bookingModalOpen} 
        onOpenChange={React_setBookingModalOpen} 
        service={selectedService} 
      />
    </section>
  );
};
