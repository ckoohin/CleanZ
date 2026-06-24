import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PublicService } from "@/features/services/types/public-service.type";
import { X, CheckCircle2, XCircle, Clock, Banknote, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface ServiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: PublicService | null;
}

export const ServiceDetailModal: React.FC<ServiceDetailModalProps> = ({ isOpen, onClose, service }) => {
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!isOpen || !service) return null;

  const firstSubService = service.subServices?.[0];
  const galleryUrls = service.subServices?.flatMap((s) => s.galleryUrls || []) || [];
  const includedTasks = service.subServices?.flatMap((s) => s.includedTasks || []) || [];
  const excludedTasks = service.subServices?.flatMap((s) => s.excludedTasks || []) || [];
  const description = service.policyDescription || firstSubService?.description || "Dịch vụ chuyên nghiệp từ CleanZ mang đến không gian sống hoàn hảo cho bạn.";
  const shortDescription = firstSubService?.shortDescription || "";
  const thumbnailUrl = service.iconUrl || firstSubService?.thumbnailUrl || "https://images.unsplash.com/photo-1581578731548-c64695cc6954?w=1600&q=80";

  const images = [
    thumbnailUrl,
    ...galleryUrls
  ];

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-background rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row z-10"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left: Image Gallery */}
          <div className="w-full md:w-1/2 h-[300px] md:h-auto bg-slate-900 relative group">
            <img
              src={images[currentImageIndex]}
              alt={service.name}
              className="w-full h-full object-cover"
            />
            
            {/* Image Navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                
                {/* Dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {images.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-2 rounded-full transition-all ${
                        idx === currentImageIndex ? "w-6 bg-white" : "w-2 bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
            
            <div className="absolute top-4 left-4">
               <div className="bg-emerald-500/90 text-white text-xs font-bold px-3 py-1.5 rounded-lg backdrop-blur-md flex items-center gap-1.5 shadow-lg">
                 <Sparkles className="w-3.5 h-3.5" /> CleanZ Premium
               </div>
            </div>
          </div>

          {/* Right: Service Details */}
          <div className="w-full md:w-1/2 flex flex-col h-full max-h-[60vh] md:max-h-none overflow-y-auto">
            <div className="p-6 md:p-8 flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 leading-tight">
                {service.name}
              </h2>
              
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-xl text-sm font-semibold">
                  <Banknote className="w-4 h-4" />
                  {service.subServices && service.subServices.length > 0 
                    ? "Từ " + Math.min(...service.subServices.map(s => s.pricing?.basePrice || 0)).toLocaleString() 
                    : "Liên hệ"}đ
                </div>
                <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-xl text-sm font-semibold text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {service.maxHours ? `Tối đa ${service.maxHours} giờ` : "Tùy chọn"}
                </div>
              </div>

              <div className="prose prose-sm dark:prose-invert mb-8 text-muted-foreground leading-relaxed">
                <p>{shortDescription || description}</p>
              </div>

              {/* Included Tasks */}
              {includedTasks.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Công việc bao gồm
                  </h3>
                  <ul className="space-y-2.5">
                    {includedTasks.map((task: string, idx: number) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Excluded Tasks */}
              {excludedTasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-destructive" /> Không bao gồm
                  </h3>
                  <ul className="space-y-2.5">
                    {excludedTasks.map((task: string, idx: number) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Bottom Action Bar */}
            <div className="p-6 bg-card border-t border-border/60 mt-auto sticky bottom-0">
              <Button 
                onClick={() => router.push(`/booking/${service.id}`)}
                className="w-full h-14 rounded-xl font-bold text-base shadow-xl shadow-primary/20"
              >
                Đặt lịch ngay
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
