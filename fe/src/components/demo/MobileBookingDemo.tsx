"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, Star, MapPin, ChevronRight, Clock, Calendar, 
  Check, Phone, ShieldCheck, Heart, User, Bell, Search, 
  Bookmark, Award, Home, Coffee, Wind, Wrench, ChevronLeft
} from "lucide-react";
import { toast } from "sonner";

// Mock Services Data
interface ServiceItem {
  id: string;
  name: string;
  category: string;
  price: number;
  rating: number;
  reviews: number;
  duration: string;
  imageUrl: string;
  description: string;
  isPopular?: boolean;
}

const CATEGORIES = [
  { id: "all", name: "Tất cả", icon: Sparkles },
  { id: "cleaning", name: "Dọn dẹp nhà", icon: Home },
  { id: "appliance", name: "Vệ sinh máy lạnh", icon: Wind },
  { id: "laundry", name: "Giặt ủi/Sofa", icon: Coffee },
  { id: "repair", name: "Sửa chữa điện", icon: Wrench },
];

const SERVICES: ServiceItem[] = [
  {
    id: "clean-1",
    name: "Dọn dẹp nhà định kỳ",
    category: "cleaning",
    price: 180000,
    rating: 4.9,
    reviews: 1240,
    duration: "2-3 giờ",
    imageUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=500&q=80",
    description: "Quét dọn, lau sàn, lau bụi nội thất, dọn dẹp phòng ngủ, nhà vệ sinh và đổ rác định kỳ.",
    isPopular: true,
  },
  {
    id: "clean-2",
    name: "Tổng vệ sinh chuyên sâu",
    category: "cleaning",
    price: 450000,
    rating: 4.8,
    reviews: 620,
    duration: "4-5 giờ",
    imageUrl: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=500&q=80",
    description: "Vệ sinh toàn diện từ trên xuống dưới, lau cửa kính, hút bụi khe hẹp, tẩy ố nhà tắm và khử trùng bếp.",
  },
  {
    id: "ac-1",
    name: "Vệ sinh máy lạnh treo tường",
    category: "appliance",
    price: 150000,
    rating: 4.9,
    reviews: 2150,
    duration: "1 giờ",
    imageUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=500&q=80",
    description: "Bơm rửa lưới lọc, vệ sinh dàn nóng/lạnh bằng vòi áp lực cao, kiểm tra gas và bảo hành chảy nước 1 tháng.",
    isPopular: true,
  },
  {
    id: "laundry-1",
    name: "Giặt hấp Sofa nỉ/da",
    category: "laundry",
    price: 320000,
    rating: 4.7,
    reviews: 410,
    duration: "1.5 giờ",
    imageUrl: "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=500&q=80",
    description: "Phun hơi nước nóng diệt khuẩn, chà bọt chuyên dụng, hút nước bẩn bằng máy áp lực cao và sấy khô 90%.",
  },
  {
    id: "repair-1",
    name: "Sửa chữa điện gia dụng",
    category: "repair",
    price: 250000,
    rating: 4.8,
    reviews: 380,
    duration: "1-2 giờ",
    imageUrl: "https://images.unsplash.com/photo-1621905252507-b354bc25edac?auto=format&fit=crop&w=500&q=80",
    description: "Kiểm tra hệ thống điện chập cháy, thay mới aptomat, lắp đặt ổ cắm thông minh hoặc bảng điện gia đình.",
  },
];

export function MobileBookingDemo() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedDate, setSelectedDate] = useState("2026-06-23");
  const [selectedTime, setSelectedTime] = useState("");
  const [isBooked, setIsBooked] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const formatVND = (value: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

  // Filter Services
  const filteredServices = SERVICES.filter(s => {
    const matchCat = selectedCategory === "all" || s.category === selectedCategory;
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        s.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const timeSlots = ["08:00", "09:30", "11:00", "13:30", "15:00", "16:30", "18:00"];

  const handleBookingConfirm = () => {
    if (!selectedTime) {
      toast.error("Vui lòng chọn khung giờ làm việc!");
      return;
    }
    setIsBooked(true);
    toast.success(`Đã đăng ký đơn thành công: ${selectedService?.name}!`);
  };

  const resetBooking = () => {
    setSelectedService(null);
    setSelectedTime("");
    setIsBooked(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-0 md:p-6 select-none font-sans overflow-hidden">
      {/* 3D Background Glow Effect */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-[#FFA000]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Phone Frame Simulator (Hidden on Mobile) */}
      <div className="relative w-full h-screen md:w-[410px] md:h-[840px] md:rounded-[36px] md:border-[12px] md:border-slate-800 md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] bg-background flex flex-col overflow-hidden text-foreground">
        
        {/* Dynamic Island / Notch for Phone simulator */}
        <div className="hidden md:flex absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-50 justify-center items-center">
          <div className="w-3.5 h-3.5 rounded-full bg-slate-950 ml-6" />
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 ml-3" />
        </div>

        {/* --- HEADER --- */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/40 px-5 pt-4 pb-3 flex flex-col gap-2.5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-lg bg-[#FFA000]/15 flex items-center justify-center text-[#FFA000] border border-[#FFA000]/20">
                <Sparkles className="w-4 h-4 fill-[#FFA000]/10" />
              </div>
              <span className="font-serif text-lg font-black tracking-tight text-foreground flex items-center gap-1">
                CleanZ <span className="text-xs font-sans font-bold bg-[#FFA000] text-white px-1.5 py-0.5 rounded-md uppercase tracking-wider ml-1">PRO</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                <Bell className="w-4 h-4 text-foreground/80" />
                <span className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-[#FFA000]" />
              </div>
              <div className="w-8 h-8 rounded-full overflow-hidden border border-border">
                <img 
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" 
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Map Location Card */}
          <div className="flex items-center gap-2 bg-muted/30 p-2.5 rounded-xl border border-border/40 cursor-pointer hover:bg-muted/50 transition-colors">
            <MapPin className="w-4 h-4 text-[#FFA000]" />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider leading-none">Địa điểm làm việc</p>
              <p className="text-xs font-semibold text-foreground/90 truncate mt-0.5">256 Nguyễn Thị Minh Khai, Quận 3, HCM</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </header>

        {/* --- SCROLL CONTAINER --- */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-hide">
          
          {/* Hero Banner Card */}
          <div className="relative rounded-2xl overflow-hidden p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 shadow-inner">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFA000]/10 rounded-full blur-2xl" />
            <div className="relative z-10 space-y-2 text-left">
              <BadgeCheck />
              <h2 className="text-xl font-bold font-serif leading-tight">
                Ưu đãi CleanZ <span className="text-[#FFA000]">Giảm 25%</span><br />Vệ sinh máy lạnh hôm nay
              </h2>
              <p className="text-[10px] text-muted-foreground">Áp dụng tự động khi đặt lịch từ 08:00 - 16:00.</p>
            </div>
            <div className="absolute right-3 bottom-0 w-24 h-24 opacity-20 pointer-events-none">
              <Wind className="w-full h-full text-primary" />
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Tìm kiếm dịch vụ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 bg-muted/40 border border-border/40 rounded-xl pl-9 pr-4 text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#FFA000]/40 focus:bg-background transition-all"
            />
          </div>

          {/* Category Horizontal Scroll */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-foreground/70 uppercase tracking-widest text-left">Danh mục dịch vụ</h3>
            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide -mx-5 px-5">
              {CATEGORIES.map((c) => {
                const IconComponent = c.icon;
                const isSelected = selectedCategory === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`flex items-center gap-1.5 h-10 px-4 rounded-xl text-xs font-semibold shrink-0 transition-all border ${
                      isSelected 
                        ? "bg-[#FFA000] text-white border-[#FFA000] shadow-md shadow-[#FFA000]/20" 
                        : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted/70 hover:text-foreground"
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Services Grid (2 Columns on mobile viewport) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground/70 uppercase tracking-widest">Dịch vụ nổi bật</h3>
              <span className="text-[10px] text-muted-foreground font-semibold">{filteredServices.length} kết quả</span>
            </div>

            {filteredServices.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border/60 rounded-2xl bg-muted/10">
                <p className="text-xs text-muted-foreground">Không tìm thấy dịch vụ nào phù hợp.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3.5">
                {filteredServices.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => setSelectedService(service)}
                    className="flex flex-col bg-card border border-border/50 rounded-2xl overflow-hidden cursor-pointer hover:border-[#FFA000]/40 hover:-translate-y-0.5 transition-all shadow-sm group text-left"
                  >
                    {/* Image Area */}
                    <div className="relative h-28 w-full overflow-hidden bg-muted">
                      <img 
                        src={service.imageUrl} 
                        alt={service.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {service.isPopular && (
                        <div className="absolute top-2 left-2 bg-[#FFA000] text-white text-[8px] font-black uppercase tracking-wider py-0.5 px-1.5 rounded-[4px] shadow-sm flex items-center gap-0.5">
                          <Award className="w-2.5 h-2.5" /> HOT
                        </div>
                      )}
                      <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-red-500 hover:bg-black/60 transition-colors">
                        <Heart className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
                      <div className="space-y-1">
                        <h4 className="font-bold text-xs text-foreground/90 line-clamp-1 leading-tight">{service.name}</h4>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="w-3 h-3 text-[#FFA000]" />
                          <span>{service.duration}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-1 flex-wrap border-t border-border/20 pt-2">
                        <span className="font-black text-xs text-[#FFA000]">{formatVND(service.price)}</span>
                        <div className="flex items-center gap-0.5 text-[9px] font-bold text-foreground/80 bg-muted px-1.5 py-0.5 rounded-[4px]">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                          <span>{service.rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* --- BOTTOM SHEET (DRAWER) FOR BOOKING DETAIL --- */}
        <AnimatePresence>
          {selectedService && (
            <>
              {/* Dark Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={resetBooking}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"
              />

              {/* Bottom Sheet Panel */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-background border-t border-border/60 rounded-t-3xl p-6 z-50 flex flex-col gap-5 shadow-[0_-15px_30px_rgba(0,0,0,0.3)] text-left"
              >
                {/* Drag Handle indicator */}
                <div className="w-12 h-1.5 bg-muted rounded-full mx-auto -mt-2 shrink-0 cursor-pointer" onClick={resetBooking} />

                {isBooked ? (
                  /* --- SUCCESS STATE SCREEN --- */
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-6 text-center space-y-5"
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-inner shadow-emerald-500/5">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold font-serif">Đặt dịch vụ thành công!</h3>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                        Đơn của bạn đã được đăng lên hệ thống. Nhân viên (Tasker) phù hợp sẽ nhận và liên hệ bạn trong vài phút.
                      </p>
                    </div>

                    {/* Booking Receipt Summary */}
                    <div className="bg-muted/30 border rounded-xl p-4 space-y-2.5 text-left text-xs max-w-sm mx-auto">
                      <div className="flex justify-between font-bold border-b pb-2">
                        <span>Dịch vụ</span>
                        <span className="text-[#FFA000]">{selectedService.name}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Thời gian làm việc</span>
                        <span className="font-semibold text-foreground">{selectedTime} • {selectedDate}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Tổng chi phí</span>
                        <span className="font-bold text-foreground">{formatVND(selectedService.price)}</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={resetBooking}
                        className="w-full h-12 rounded-xl border font-bold text-xs uppercase tracking-wider hover:bg-muted transition-all"
                      >
                        Quay về trang chủ
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  /* --- DETAIL & BOOKING FORM SCREEN --- */
                  <>
                    {/* Header Service Detail */}
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-muted">
                        <img src={selectedService.imageUrl} alt={selectedService.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <span className="text-[8px] font-black uppercase tracking-wider bg-primary/10 text-[#FFA000] px-1.5 py-0.5 rounded border border-primary/20">{selectedService.category}</span>
                        <h3 className="font-bold text-sm text-foreground line-clamp-1 leading-tight">{selectedService.name}</h3>
                        <p className="text-xs font-bold text-[#FFA000] leading-none">{formatVND(selectedService.price)}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground leading-none">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span>{selectedService.rating} ({selectedService.reviews} lượt thuê)</span>
                        </div>
                      </div>
                    </div>

                    {/* Scrollable details */}
                    <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide">
                      {/* Description */}
                      <div className="space-y-1.5">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-foreground/70">Mô tả dịch vụ</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed bg-muted/20 border border-border/30 rounded-xl p-3">
                          {selectedService.description}
                        </p>
                      </div>

                      {/* Date Select (Simulated Date Picker tabs) */}
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-foreground/70 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> Chọn ngày làm việc
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: "2026-06-23", label: "Hôm nay", desc: "23 Th06" },
                            { value: "2026-06-24", label: "Ngày mai", desc: "24 Th06" },
                            { value: "2026-06-25", label: "Ngày kia", desc: "25 Th06" },
                          ].map((d) => (
                            <button
                              key={d.value}
                              onClick={() => setSelectedDate(d.value)}
                              className={`p-2.5 rounded-xl border text-center transition-all flex flex-col gap-0.5 ${
                                selectedDate === d.value
                                  ? "bg-[#FFA000]/5 text-[#FFA000] border-[#FFA000]"
                                  : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted/50"
                              }`}
                            >
                              <span className="text-[10px] font-bold">{d.label}</span>
                              <span className="text-[9px] text-muted-foreground font-medium">{d.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Time Slots (h-12 buttons for finger tap) */}
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-foreground/70 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Chọn giờ bắt đầu (Touch targets h-12)
                        </h4>
                        <div className="grid grid-cols-4 gap-2">
                          {timeSlots.map((time) => (
                            <button
                              key={time}
                              onClick={() => setSelectedTime(time)}
                              className={`h-12 rounded-xl border font-bold text-xs transition-all flex items-center justify-center ${
                                selectedTime === time
                                  ? "bg-[#FFA000] text-white border-[#FFA000] shadow-md shadow-[#FFA000]/15"
                                  : "bg-muted/20 border-border/40 text-foreground/80 hover:bg-muted/50"
                              }`}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Booking Action Footer (Touch target h-14) */}
                    <div className="border-t border-border/20 pt-4 flex items-center gap-3">
                      <div className="text-left shrink-0">
                        <span className="text-[9px] text-muted-foreground font-black uppercase tracking-wider leading-none block">Tổng cộng</span>
                        <span className="text-lg font-black text-[#FFA000] leading-none block mt-1">{formatVND(selectedService.price)}</span>
                      </div>
                      
                      <button
                        onClick={handleBookingConfirm}
                        className="flex-1 h-14 rounded-2xl bg-[#FFA000] hover:opacity-90 text-white font-bold text-sm tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#FFA000]/20 active:scale-[0.98] transition-transform"
                      >
                        ĐẶT LỊCH NGAY
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

// Inline Sub-Components to follow rules
function BadgeCheck() {
  return (
    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFA000]/15 text-[#FFA000] border border-[#FFA000]/25 text-[8px] font-black uppercase tracking-widest">
      <Award className="w-2.5 h-2.5" /> SIÊU ƯU ĐÃI
    </div>
  );
}
