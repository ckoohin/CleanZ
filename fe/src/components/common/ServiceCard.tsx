import React, { memo } from "react";
import { m } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, Clock, ArrowRight, CalendarCheck, ShieldCheck, Heart } from "lucide-react";
import { cardVariants } from "@/features/services/motions/service.motion";
import { ServiceCardProps } from "@/types/service";

const ServiceCard = memo(({ service: s, index = 0 }: ServiceCardProps) => (
  <m.div
    custom={index}
    variants={cardVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: "-40px" }}
    className="h-full"
  >
    <Card className="group relative overflow-hidden border border-border/60 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/20 transition-all duration-500 flex flex-col h-full rounded-[1.8rem] md:rounded-[2rem] bg-card/60 backdrop-blur-sm">
      {/* Badge Tags */}
      <div className="absolute top-3 left-3 md:top-4 md:left-4 z-20 flex flex-col gap-1.5 md:gap-2">
         <Badge variant="secondary" className="bg-background/90 backdrop-blur-md text-[8px] md:text-[9px] uppercase tracking-wider font-black px-2 md:px-3 py-0.5 md:py-1 border border-border/50 text-foreground w-fit">
            {s.tag}
         </Badge>
         {index % 3 === 0 && (
           <Badge className="bg-primary text-primary-foreground text-[8px] md:text-[9px] uppercase tracking-wider font-black px-2 md:px-3 py-0.5 md:py-1 border-none w-fit">
              🔥 Bán chạy
           </Badge>
         )}
      </div>

      {/* Like Button */}
      <button className="absolute top-3 right-3 md:top-4 md:right-4 z-20 w-9 h-9 md:w-10 md:h-10 rounded-full bg-background/80 backdrop-blur-md flex items-center justify-center border border-border/50 text-muted-foreground hover:text-rose-500 hover:scale-110 transition-all">
         <Heart className="w-3.5 h-3.5 md:w-4 h-4" />
      </button>

      {/* Image Section */}
      <div className="relative h-48 md:h-64 overflow-hidden shrink-0">
        <Image
          src={s.image}
          alt={s.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
        
        {/* Rating Floating */}
        <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4 bg-white text-black px-2 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black flex items-center gap-1 md:gap-1.5 shadow-xl">
          <Star className="w-3 md:w-3.5 h-3 md:h-3.5 fill-amber-500 text-amber-500" />
          {s.rating}
          <span className="text-[8px] md:text-[10px] text-black/40 font-bold">({s.reviews})</span>
        </div>

        {/* Price Floating */}
        <div className="absolute bottom-3 left-3 md:bottom-4 md:left-4 text-white">
           <div className="flex items-baseline gap-1">
              <span className="text-xl md:text-2xl font-black">{s.price}</span>
              <span className="text-[8px] md:text-[10px] font-bold opacity-60 uppercase tracking-tighter">{s.unit}</span>
           </div>
        </div>
      </div>

      {/* Content Section */}
      <CardContent className="p-6 md:p-8 flex-1 flex flex-col font-sans">
        <div className="flex-1">
           <div className="flex items-center gap-1.5 mb-2 md:mb-3">
              <ShieldCheck className="w-3 md:w-3.5 h-3 md:h-3.5 text-emerald-500" />
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-emerald-500">Bảo hiểm 100%</span>
           </div>
           <h3 className="font-bold text-base md:text-xl text-foreground leading-tight mb-2 md:mb-3 group-hover:text-primary transition-colors line-clamp-2">
              {s.title}
           </h3>
           <p className="text-muted-foreground text-[11px] md:text-[13px] line-clamp-2 leading-relaxed font-light mb-4 md:mb-6">
             {s.desc}
           </p>
        </div>

        <div className="flex items-center justify-between py-3 md:py-4 border-t border-border/40">
           <div className="flex flex-col">
              <span className="text-[8px] md:text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-0.5 md:mb-1">Thời gian</span>
              <div className="flex items-center gap-1 text-foreground font-bold text-[10px] md:text-xs uppercase">
                 <Clock className="w-3 md:w-3.5 h-3 md:h-3.5 text-primary" />
                 {s.duration}
              </div>
           </div>
           <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-border/40" />
           <div className="flex flex-col items-end">
              <span className="text-[8px] md:text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-0.5 md:mb-1">Trạng thái</span>
              <span className="text-[9px] md:text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                 <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                 Sẵn sàng
              </span>
           </div>
        </div>

        <Button
          className="w-full mt-4 md:mt-6 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] md:text-xs uppercase tracking-widest gap-2 md:gap-3 rounded-xl md:rounded-2xl h-12 md:h-14 shadow-lg shadow-primary/10 border-none group/btn"
          asChild
        >
          <Link href={s.bookingUrl ?? "#"}>
            <CalendarCheck className="w-3.5 h-3.5 md:w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
            Đặt lịch ngay
            <ArrowRight className="w-3 h-3 md:w-3.5 md:h-3.5 opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  </m.div>
));

ServiceCard.displayName = "ServiceCard";

export default ServiceCard;
