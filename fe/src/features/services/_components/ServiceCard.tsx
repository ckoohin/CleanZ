import React from "react";
import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Clock, Heart, MoveRight, ArrowRight, ShieldCheck } from "lucide-react";
import { cardVariants } from "../motions/service.motion";
import { ServiceItem } from "@/features/services/types/service.type";

interface ServiceCardProps {
  service: ServiceItem;
}

const ServiceCard: React.FC<ServiceCardProps & { index: number } & { onBook?: (service: ServiceItem) => void }> = ({ service: s, index, onBook }) => {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      className="h-full"
    >
      <Card className="group flex flex-col h-full overflow-hidden border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl transition-all duration-300">
        
        {/* Image Section - Aspect Ratio */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          <img
            src={s.image}
            alt={s.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
          />
          
          {/* Badge Tags Top Left */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
            <Badge variant="secondary" className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 text-slate-800 dark:text-slate-200 border-none">
              {s.tag}
            </Badge>
            {index % 3 === 0 && (
              <Badge className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 border-none w-fit shadow-md">
                Hot
              </Badge>
            )}
          </div>

          {/* Like Button Top Right */}
          <button className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shadow-sm">
            <Heart className="w-4 h-4" />
          </button>

          {/* Rating Bottom Right */}
          <div className="absolute bottom-3 right-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm text-slate-900 dark:text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            {s.rating}
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">({s.reviews})</span>
          </div>
        </div>

        {/* Content Section */}
        <CardContent className="p-5 flex-1 flex flex-col">
          <div className="flex items-center gap-1.5 mb-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Bảo hiểm 100%</span>
          </div>
          
          <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-1 mb-1.5 group-hover:text-primary transition-colors">
            {s.title}
          </h3>
          
          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
            {s.desc}
          </p>

          <div className="mt-auto">
            <div className="flex items-center justify-between py-3 border-y border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Thời gian</span>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  {s.duration}
                </div>
              </div>
              
              <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700" />
              
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Chi phí từ</span>
                <div className="flex items-baseline gap-1 text-primary">
                  <span className="text-base font-bold">{s.price}</span>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{s.unit}</span>
                </div>
              </div>
            </div>

            <Button
              className="w-full h-11 bg-slate-900 hover:bg-primary text-white dark:bg-white dark:text-slate-900 dark:hover:bg-primary dark:hover:text-white font-semibold rounded-xl transition-colors"
              onClick={() => onBook && onBook(s)}
            >
              Đặt lịch ngay
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ServiceCard;
