'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Calendar as CalendarIcon, 
  User, 
  CheckCircle2, 
  ShieldCheck, 
  Info,
  ChevronRight,
  CreditCard,
  Minus,
  Sparkles,
  Zap,
  Gift,
  AlertCircle,
  HelpCircle,
  XCircle,
  Check,
  Smartphone,
  Wallet,
  Building2,
  Loader2,
  PawPrint,
} from "lucide-react";
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import Container from "@/components/Container";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { toast } from 'sonner';
import { usePublicServices } from '@/features/services/hooks/usePublicServices';
import { useBookingQuoteQuery, useCreateBooking } from '@/features/booking/hooks/useCustomerBooking';
import { useMyAddresses } from '@/features/customer/hooks/useCustomerAddress';
import type { CustomerAddress } from '@/features/customer/services/address.service';
import type { PublicSubService } from '@/features/services/types/public-service.type';


// Format date as YYYY-MM-DD using local timezone (avoid UTC shift)
function formatLocalDate(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

// Helper to convert to slug
function toSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/([^0-9a-z-\s])/g, "")
    .replace(/(\s+)/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\-+|\-+$/g, "");
}

// Dữ liệu mẫu mở rộng phục vụ giáo dục khách hàng
const DUMMY_SERVICE = {
  id: "cleaning-standard",
  title: "Dọn nhà chuyên sâu",
  category: "Vệ sinh",
  rating: 4.9,
  reviews: 1280,
  price: 150000,
  unit: "giờ",
  duration: "3-4 giờ",
  image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1600&q=80",
  description: "Dịch vụ vệ sinh toàn diện mang lại không gian sống trong lành nhất cho gia đình bạn. Chúng tôi không chỉ dọn dẹp, chúng tôi chăm sóc từng ngóc ngách bằng sự tận tâm và công nghệ vệ sinh hiện đại nhất.",
  benefits: [
    { icon: Zap, title: "Nhanh chóng", desc: "Có mặt sau 60 phút đặt lịch" },
    { icon: ShieldCheck, title: "Bảo hiểm", desc: "Bảo vệ tài sản lên đến 20tr" },
    { icon: Sparkles, title: "Sạch sâu", desc: "Hóa chất đạt chuẩn an toàn" },
  ],
  process: [
    { step: "01", title: "Khảo sát và Phân loại", desc: "Nhân viên kiểm tra tình trạng bề mặt và vật liệu để chọn hóa chất phù hợp." },
    { step: "02", title: "Dọn dẹp thô", desc: "Thu gom rác, hút bụi toàn bộ sàn nhà và các hốc tường." },
    { step: "03", title: "Vệ sinh chi tiết", desc: "Lau kính, khử khuẩn bếp, phòng tắm bằng máy hơi nước nóng." },
    { step: "04", title: "Nghiệm thu", desc: "Khách hàng kiểm tra và ký biên bản hoàn thành." },
  ],
  inclusions: ["Hút bụi sàn & thảm", "Lau kính mặt trong (dưới 2m)", "Vệ sinh toilet & bồn rửa", "Khử mùi phòng khách"],
  exclusions: ["Giặt rèm/thảm nặng", "Lau kính mặt ngoài nhà cao tầng", "Nấu ăn/Trông trẻ", "Di chuyển đồ nội thất nặng"],
  experts: [
    { id: 1, name: "Nguyễn Thị Hoa", rating: 4.9, avatar: "https://i.pravatar.cc/150?u=hoa", role: "Trưởng nhóm", experience: "5 năm" },
    { id: 2, name: "Trần Văn Nam", rating: 4.8, avatar: "https://i.pravatar.cc/150?u=nam", role: "Kỹ thuật", experience: "3 năm" },
    { id: 3, name: "Lê Thị Lan", rating: 5.0, avatar: "https://i.pravatar.cc/150?u=lan", role: "Chuyên viên", experience: "4 năm" },
  ],
  faqs: [
    { q: "Tôi có cần chuẩn bị dụng cụ vệ sinh không?", a: "Nhân viên của chúng tôi đã trang bị đầy đủ máy hút bụi và hóa chất chuyên dụng. Bạn không cần chuẩn bị thêm gì." },
    { q: "Nếu có đồ đạc bị hư hỏng thì sao?", a: "Chúng tôi có gói bảo hiểm trách nhiệm dân sự. Mọi hư hỏng do nhân viên gây ra sẽ được bối thường 100% giá trị sau khi xác minh." },
    { q: "Tôi muốn thay đổi giờ làm việc?", a: "Bạn có thể thay đổi hoặc hủy lịch miễn phí trước 2 giờ so với giờ hẹn qua ứng dụng hoặc hotline." }
  ]
};

const TIME_SLOTS = ["08:00", "09:00", "10:00", "13:00", "14:00", "15:00", "16:00", "18:00"];

const PAYMENT_METHODS = [
  { id: 'CASH' as const, name: 'Tiền mặt', icon: Wallet, desc: 'Trả sau khi hoàn thành ca làm' },
  { id: 'WALLET' as const, name: 'Ví CleanZ', icon: Smartphone, desc: 'Trừ thẳng số dư ví, nạp bằng PayPal' },
];

interface ServiceBookingPageProps {
  slug: string;
}

export default function ServiceBookingPage({ slug }: ServiceBookingPageProps) {
  const router = useRouter();
  
  // 1. Tải danh sách Gói dịch vụ & Địa chỉ từ API
  const { data: servicesResponse, isLoading: isLoadingServices } = usePublicServices();
  const { data: addresses } = useMyAddresses();
  
  // 2. Tìm gói dịch vụ hiện tại dựa trên slug
  const currentPackage = useMemo(() => {
    if (!servicesResponse?.data) return null;
    return servicesResponse.data.find(pkg => {
      const pSlug = toSlug(pkg.name);
      const codeSlug = pkg.packageCode.toLowerCase();
      return pSlug === slug || codeSlug === slug.toLowerCase() || pkg.id === slug;
    });
  }, [servicesResponse, slug]);

  // 3. Khai báo state đặt lịch & Multi-step Wizard
  const [currentStep, setCurrentStep] = useState(1);
  const [detailSubService, setDetailSubService] = useState<PublicSubService | null>(null);
  const [isMainDescDrawerOpen, setIsMainDescDrawerOpen] = useState(false);

  const [date, setDate] = useState<Date | undefined>(() =>
    new Date(Date.now() + 24 * 60 * 60 * 1000)
  );
  const [selectedTime, setSelectedTime] = useState("08:00");
  
  // Quản lý các dịch vụ bị BỎ CHỌN (mặc định trống = chọn tất cả)
  const [deselectedSubServiceIds, setDeselectedSubServiceIds] = useState<string[]>([]);
  const [areaM2, setAreaM2] = useState<number>(50);
  
  // Quản lý địa chỉ
  const [userSelectedAddressId, setUserSelectedAddressId] = useState<string | null>(null);
  const [customAddressInput, setCustomAddressInput] = useState<string>("");

  const [selectedPayment, setSelectedPayment] = useState<'CASH' | 'WALLET'>('CASH');
  const [voucher, setVoucher] = useState("");
  const [note, setNote] = useState("");
  const [hasPet, setHasPet] = useState(false);

  // Tự động tính toán các dịch vụ con đang được chọn (State Derivation)
  const selectedSubServiceIds = useMemo(() => {
    if (!currentPackage?.subServices) return [];
    return currentPackage.subServices
      .map(s => s.id)
      .filter(id => !deselectedSubServiceIds.includes(id));
  }, [currentPackage, deselectedSubServiceIds]);

  // Tìm địa chỉ mặc định từ danh sách API
  const defaultAddress = useMemo(() => {
    if (!addresses || addresses.length === 0) return null;
    return addresses.find((a: CustomerAddress) => a.isDefault) || addresses[0];
  }, [addresses]);

  // Xác định ID địa chỉ đang hoạt động (Nếu user chưa chọn thì lấy mặc định)
  const selectedAddressId = useMemo(() => {
    if (userSelectedAddressId === null) {
      return defaultAddress?.id || "";
    }
    return userSelectedAddressId;
  }, [userSelectedAddressId, defaultAddress]);

  // Xác định chuỗi địa chỉ gửi lên API
  const addressInput = useMemo(() => {
    if (selectedAddressId) {
      const found = addresses?.find((a: CustomerAddress) => a.id === selectedAddressId);
      return found ? found.fullAddress : "";
    }
    return customAddressInput;
  }, [selectedAddressId, addresses, customAddressInput]);

  // Tính tổng thời lượng dự kiến của các sub-services đã chọn
  const totalDurationHours = useMemo(() => {
    if (!currentPackage?.subServices) return 0;
    return currentPackage.subServices
      .filter(s => selectedSubServiceIds.includes(s.id))
      .reduce((sum, s) => sum + Number(s.durationHours), 0);
  }, [currentPackage, selectedSubServiceIds]);

  // Xây dựng payload để gọi API tính giá realtime
  const quotePayload = useMemo(() => {
    if (!currentPackage) return null;
    return {
      packageId: currentPackage.id,
      subServiceIds: selectedSubServiceIds,
      addressId: selectedAddressId || undefined,
      address: !selectedAddressId ? addressInput : undefined,
      scheduledDate: date ? formatLocalDate(date) : "",
      scheduledTime: selectedTime,
      voucherCode: voucher || undefined,
      areaM2: currentPackage.pricingMode === 'AREA_HOURLY' ? Number(areaM2) : undefined,
      hasPet,
    };
  }, [currentPackage, selectedSubServiceIds, selectedAddressId, addressInput, date, selectedTime, voucher, areaM2, hasPet]);

  // Debounce 500ms để tránh gọi API liên tục khi user đang chọn
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedPayload, setDebouncedPayload] = useState(quotePayload);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedPayload(quotePayload), 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [quotePayload]);

  // Quote chỉ bật khi đã có đủ: package + sub-services + ngày + giờ + địa chỉ
  const hasAddress = !!(selectedAddressId || customAddressInput.trim());
  const {
    data: quoteData,
    isLoading: isLoadingQuote,
    isFetching: isFetchingQuote,
    error: quoteError
  } = useBookingQuoteQuery(
    debouncedPayload || { scheduledDate: "", scheduledTime: "" },
    !!debouncedPayload && !!currentPackage && selectedSubServiceIds.length > 0 && !!selectedTime && !!date && hasAddress
  );

  // Mutation Tạo đơn hàng
  const createBookingMutation = useCreateBooking();

  const handleCreateBooking = () => {
    if (!currentPackage) return;
    if (selectedSubServiceIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một dịch vụ con");
      return;
    }
    if (!selectedTime || !date) {
      toast.error("Vui lòng chọn ngày và giờ làm việc");
      return;
    }
    if (!selectedAddressId && !addressInput) {
      toast.error("Vui lòng chọn hoặc nhập địa chỉ làm việc");
      return;
    }

    createBookingMutation.mutate({
      packageId: currentPackage.id,
      subServiceIds: selectedSubServiceIds,
      addressId: selectedAddressId || undefined,
      address: !selectedAddressId ? addressInput : undefined,
      scheduledDate: formatLocalDate(date),
      scheduledTime: selectedTime,
      note: note || undefined,
      voucherCode: voucher || undefined,
      areaM2: currentPackage.pricingMode === 'AREA_HOURLY' ? Number(areaM2) : undefined,
      hasPet,
      paymentMethod: selectedPayment,
    }, {
      onSuccess: () => {
        router.push('/customer/bookings');
      }
    });
  };

  // Trạng thái tải trang ban đầu
  if (isLoadingServices || !currentPackage) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium animate-pulse">Đang tải thông tin gói dịch vụ...</p>
      </div>
    );
  }

  // Kết hợp thông tin gói thật và fallback DUMMY_SERVICE cho các phần mô tả giáo dục
  const serviceDetail = {
    ...DUMMY_SERVICE,
    title: currentPackage.name,
    description: currentPackage.description || DUMMY_SERVICE.description,
    policyDescription: currentPackage.policyDescription || "",
    image: currentPackage.thumbnailUrl || DUMMY_SERVICE.image,
    price: currentPackage.subServices?.[0]?.pricing?.basePrice || DUMMY_SERVICE.price,
    inclusions: currentPackage.includedTasks?.length ? currentPackage.includedTasks : DUMMY_SERVICE.inclusions,
    exclusions: currentPackage.excludedTasks?.length ? currentPackage.excludedTasks : DUMMY_SERVICE.exclusions,
  };

  const steps = [
    { number: 1, label: "Tùy chọn dịch vụ" },
    { number: 2, label: "Thời gian & Địa điểm" },
    { number: 3, label: "Xác nhận & Thanh toán" }
  ];

  return (
    <div className="min-h-screen bg-background pb-32 transition-colors duration-300">
      {/* 1. Header Navigation */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl border-b border-border/40">
        <Container className="px-5 md:px-0 h-16 md:h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex flex-col">
                 <h1 className="font-bold text-sm md:text-lg truncate max-w-[200px] md:max-w-none">{serviceDetail.title}</h1>
                 <p className="hidden md:block text-[10px] text-muted-foreground uppercase tracking-widest font-black">CleanZ Premium</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
               <Badge className="bg-emerald-500/10 text-emerald-500 border-none hidden sm:flex">Sẵn sàng ngay</Badge>
               <Button variant="outline" size="icon" className="rounded-xl border-border/60">
                  <HelpCircle className="w-4 h-4" />
               </Button>
            </div>
        </Container>
      </div>

      {/* 2. Progress Stepper UI */}
      <div className="w-full py-6 bg-muted/20 border-b border-border/40 mb-8 md:mb-12">
        <Container className="px-5 md:px-0 flex items-center justify-between max-w-xl mx-auto">
           {steps.map((s, idx) => (
              <React.Fragment key={s.number}>
                 <div className="flex flex-col items-center gap-2 relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                       currentStep >= s.number 
                       ? 'bg-primary text-primary-foreground font-black shadow-lg shadow-primary/20' 
                       : 'bg-muted text-muted-foreground'
                    }`}>
                       {s.number}
                    </div>
                    <span className={`text-[10px] md:text-xs font-bold whitespace-nowrap ${
                       currentStep === s.number ? 'text-primary animate-pulse' : 'text-muted-foreground'
                    }`}>
                       {s.label}
                    </span>
                 </div>
                 {idx < steps.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-4 transition-colors ${
                       currentStep > s.number ? 'bg-primary' : 'bg-muted'
                    }`} />
                 )}
              </React.Fragment>
           ))}
        </Container>
      </div>

      <Container className="px-5 md:px-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          
          {/* LEFT COLUMN: Multi-step form panels */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* STEP 1: SERVICE CONFIG */}
            {currentStep === 1 && (
              <motion.div 
                 initial={{ opacity: 0, y: 15 }} 
                 animate={{ opacity: 1, y: 0 }}
                 className="space-y-12"
              >
                 {/* Title Header */}
                 <div className="space-y-2">
                   <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Thiết lập <span className="italic text-primary">gói dịch vụ</span></h2>
                   <p className="text-muted-foreground text-sm font-light">Tùy biến các tùy chọn của gói vệ sinh để CleanZ phục vụ tốt nhất.</p>
                 </div>

                 {/* Box Mô tả dịch vụ */}
                 {serviceDetail.description && (
                   <div className="bg-muted/30 border border-border/40 p-5 rounded-2xl space-y-2">
                     <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                       <Info className="w-4 h-4 text-primary" />
                       <span>Mô tả dịch vụ & Chính sách</span>
                     </div>
                     <div className="text-sm text-foreground/80 leading-relaxed">
                       <p className="line-clamp-5 whitespace-pre-wrap">
                         {serviceDetail.description}
                       </p>
                       <div className="mt-2 flex justify-start">
                         <button
                           type="button"
                           onClick={() => setIsMainDescDrawerOpen(true)}
                           className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                         >
                           Xem chi tiết & chính sách...
                         </button>
                       </div>
                     </div>
                   </div>
                 )}

                 {/* Area Input (pricingMode === 'AREA_HOURLY') */}
                 {currentPackage.pricingMode === 'AREA_HOURLY' && (
                    <section className="space-y-6 bg-card border border-border/40 p-8 rounded-[2rem] shadow-sm">
                       <h4 className="flex items-center gap-3 font-bold text-lg">
                          <Building2 className="w-5 h-5 text-sky-500" /> Diện tích căn hộ (m²)
                       </h4>
                       <div className="relative">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                             type="number"
                             min={10}
                             max={500}
                             placeholder="Diện tích căn hộ (m²)..." 
                             className="pl-11 h-14 rounded-2xl border-border/60 bg-background/50 focus-visible:ring-primary/20 font-bold"
                             value={areaM2 || ""}
                             onChange={(e) => setAreaM2(Number(e.target.value))}
                          />
                       </div>
                       <p className="text-[10px] text-muted-foreground font-light leading-relaxed">
                          * Gói này tính tiền theo diện tích. Hệ thống sẽ tự động ghép mức giá và đề xuất nhân sự tương thích.
                       </p>
                    </section>
                 )}

                 {/* Sub-services Selection (Card Grid style) */}
                 <section className="space-y-6">
                    <h4 className="flex items-center gap-3 font-bold text-lg">
                       <Sparkles className="w-5 h-5 text-amber-500" /> Dịch vụ con chọn thêm
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {currentPackage.subServices && currentPackage.subServices.map((sub) => {
                          const isSelected = selectedSubServiceIds.includes(sub.id);
                          const subPrice = sub.pricing?.basePrice || 0;
                          return (
                             <div
                                key={sub.id}
                                className={`flex flex-col rounded-2xl border overflow-hidden bg-card transition-all ${
                                   isSelected
                                   ? 'border-primary ring-1 ring-primary/20 shadow-sm'
                                   : 'border-border/60 hover:border-primary/40'
                                }`}
                             >
                                <div 
                                   className="p-5 flex-1 flex gap-4 cursor-pointer"
                                   onClick={() => {
                                      if (isSelected) {
                                         if (selectedSubServiceIds.length > 1) {
                                            setDeselectedSubServiceIds([...deselectedSubServiceIds, sub.id]);
                                         } else {
                                            toast.error("Vui lòng chọn ít nhất một dịch vụ con");
                                         }
                                      } else {
                                         setDeselectedSubServiceIds(deselectedSubServiceIds.filter(id => id !== sub.id));
                                      }
                                   }}
                                >
                                   <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted flex items-center justify-center shrink-0">
                                      {sub.thumbnailUrl ? (
                                         <Image src={sub.thumbnailUrl} alt={sub.name} width={48} height={48} className="w-full h-full object-cover" unoptimized />
                                      ) : (
                                         <Sparkles className="w-5 h-5 text-primary" />
                                      )}
                                   </div>
                                   <div className="flex-1 flex flex-col gap-1 pr-1">
                                      <span className="text-sm font-bold leading-tight">{sub.name}</span>
                                      {sub.shortDescription && (
                                         <span className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{sub.shortDescription}</span>
                                      )}
                                      <div className="flex items-center gap-2 mt-2">
                                         <Badge className="bg-primary/10 text-primary text-[9px] hover:bg-primary/20 font-bold px-2 py-0.5 border-none">
                                            +{sub.durationHours}h
                                         </Badge>
                                         {subPrice > 0 && (
                                            <span className="text-xs font-bold text-primary">+{subPrice.toLocaleString()}đ</span>
                                         )}
                                      </div>
                                   </div>
                                   <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                                      isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'
                                   }`}>
                                      {isSelected && <Check className="w-3.5 h-3.5" />}
                                   </div>
                                </div>
                                <div className="px-5 py-2.5 bg-muted/10 border-t border-border/40 flex justify-end">
                                   <button
                                      type="button"
                                      onClick={(e) => {
                                         e.stopPropagation();
                                         setDetailSubService(sub);
                                      }}
                                      className="text-[10px] font-black uppercase text-muted-foreground hover:text-primary tracking-wider flex items-center gap-1 transition-colors"
                                   >
                                      <Info className="w-3 h-3" /> Chi tiết công việc
                                   </button>
                                </div>
                             </div>
                          );
                       })}
                    </div>
                 </section>

                 {/* Pet toggle */}
                 <section className="space-y-4">
                    <h4 className="flex items-center gap-3 font-bold text-lg">
                       <PawPrint className="w-5 h-5 text-amber-500" /> Tuỳ chọn thú cưng
                    </h4>
                    <button
                       type="button"
                       onClick={() => setHasPet((v) => !v)}
                       className={`w-full flex items-center justify-between gap-4 p-5 rounded-2xl border transition-all ${
                         hasPet
                           ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 ring-1 ring-amber-400/30'
                           : 'border-border/60 bg-card hover:border-amber-400/40'
                       }`}
                    >
                       <div className="flex items-center gap-3 text-left">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasPet ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-muted'}`}>
                             <PawPrint className={`w-5 h-5 ${hasPet ? 'text-amber-600' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                             <p className="text-sm font-bold">Nhà có thú cưng</p>
                             <p className="text-xs text-muted-foreground">Tasker mang dụng cụ phù hợp, có thể phát sinh phụ phí.</p>
                          </div>
                       </div>
                       <div className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${hasPet ? 'bg-amber-400' : 'bg-muted-foreground/20'}`}>
                          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${hasPet ? 'translate-x-6' : 'translate-x-0.5'}`} />
                       </div>
                    </button>
                 </section>

                 {/* Inclusions & Exclusions */}
                 <section className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-card/40 rounded-[2rem] p-8 md:p-10 border border-border/40">
                    <div className="space-y-6">
                       <h4 className="flex items-center gap-3 text-lg font-bold text-emerald-500">
                          <CheckCircle2 className="w-5 h-5" /> Công việc thực hiện
                       </h4>
                       <ul className="space-y-3">
                          {serviceDetail.inclusions.map((item, i) => (
                            <li key={i} className="flex items-start gap-3 text-xs md:text-sm font-light leading-relaxed">
                               <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> <span>{item}</span>
                            </li>
                          ))}
                       </ul>
                    </div>
                    <div className="space-y-6">
                       <h4 className="flex items-center gap-3 text-lg font-bold text-rose-500">
                          <XCircle className="w-5 h-5" /> Lưu ý quan trọng
                       </h4>
                       <ul className="space-y-3">
                          {serviceDetail.exclusions.map((item, i) => (
                            <li key={i} className="flex items-start gap-3 text-xs md:text-sm font-light text-muted-foreground/60 leading-relaxed">
                               <Minus className="w-4 h-4 opacity-40 shrink-0 mt-0.5" /> <span>{item}</span>
                            </li>
                          ))}
                       </ul>
                    </div>
                 </section>
              </motion.div>
            )}

            {/* STEP 2: SCHEDULE & LOCATION */}
            {currentStep === 2 && (
              <motion.div 
                 initial={{ opacity: 0, y: 15 }} 
                 animate={{ opacity: 1, y: 0 }}
                 className="space-y-8 bg-card border border-border/40 p-8 md:p-12 rounded-[2.5rem] shadow-sm"
              >
                 <div className="space-y-2 border-b border-border/40 pb-6">
                   <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Thời gian & Địa điểm</h2>
                   <p className="text-muted-foreground text-sm font-light">Chọn thời gian và địa điểm CleanZ sẽ tới phục vụ bạn.</p>
                 </div>

                 {/* Location Selection */}
                 <section className="space-y-6">
                    <h4 className="flex items-center gap-3 font-bold text-lg">
                      <MapPin className="w-5 h-5 text-primary" /> Địa điểm làm việc
                    </h4>
                    
                    {addresses && addresses.length > 0 ? (
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block">Chọn địa chỉ đã lưu</label>
                        <select
                          value={userSelectedAddressId !== null ? userSelectedAddressId : (defaultAddress?.id || "")}
                          onChange={(e) => {
                            const addrId = e.target.value;
                            setUserSelectedAddressId(addrId);
                            if (!addrId) {
                              setCustomAddressInput("");
                            }
                          }}
                          className="w-full h-14 px-4 rounded-2xl border border-border/60 bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium"
                        >
                          {addresses.map((a: CustomerAddress) => (
                            <option key={a.id} value={a.id}>
                              {a.label ? `[${a.label}] ` : ""}{a.fullAddress}
                            </option>
                          ))}
                          <option value="">+ Nhập địa chỉ mới...</option>
                        </select>
                        
                        {userSelectedAddressId === "" && (
                          <div className="relative mt-2">
                             <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                             <Input 
                                placeholder="Nhập địa chỉ giao việc mới..." 
                                className="pl-11 h-14 rounded-2xl border-border/60 bg-background/50 focus-visible:ring-primary/20 font-medium"
                                value={customAddressInput}
                                onChange={(e) => setCustomAddressInput(e.target.value)}
                             />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative">
                         <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                         <Input 
                            placeholder="Địa chỉ giao việc..." 
                            className="pl-11 h-14 rounded-2xl border-border/60 bg-background/50 focus-visible:ring-primary/20 font-medium"
                            value={customAddressInput}
                            onChange={(e) => setCustomAddressInput(e.target.value)}
                         />
                      </div>
                    )}
                 </section>

                 <Separator className="border-border/40" />

                 {/* Date & Time Selection */}
                 <section className="space-y-6">
                    <h4 className="flex items-center gap-3 font-bold text-lg">
                       <Clock className="w-5 h-5 text-blue-500" /> Thời gian làm việc
                    </h4>
                    <div className="flex flex-col gap-4">
                       <Accordion type="single" collapsible>
                          <AccordionItem value="calendar" className="border-none">
                             <AccordionTrigger className="bg-muted/40 rounded-2xl px-6 py-4 hover:no-underline border border-border/40">
                                <div className="flex items-center gap-3">
                                   <CalendarIcon className="w-4 h-4 text-primary" />
                                   <span className="font-bold text-sm">
                                      {date ? date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' }) : 'Chọn ngày'}
                                   </span>
                                </div>
                             </AccordionTrigger>
                             <AccordionContent className="pt-4 flex justify-center">
                                <Calendar
                                  mode="single"
                                  selected={date}
                                  onSelect={setDate}
                                  className="rounded-2xl border border-border/40 bg-card p-4 shadow-xl"
                                  disabled={(d) => d < new Date() || d < new Date("1900-01-01")}
                                />
                             </AccordionContent>
                          </AccordionItem>
                       </Accordion>

                       <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide -mx-2 px-2">
                          {TIME_SLOTS.map((t) => (
                             <button
                                key={t}
                                type="button"
                                onClick={() => setSelectedTime(t)}
                                className={`shrink-0 px-6 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${
                                   selectedTime === t 
                                   ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20' 
                                   : 'bg-background border-border/40 text-muted-foreground hover:border-primary/40'
                                }`}
                             >
                                {t}
                             </button>
                          ))}
                       </div>
                    </div>
                 </section>

                 <Separator className="border-border/40" />

                 {/* Note */}
                 <section className="space-y-4">
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Ghi chú vận hành</h4>
                    <Textarea 
                       placeholder="Nhập nội dung ghi chú (ví dụ: nhà có vật nuôi, ngõ hẹp, mang theo thang cao...)..." 
                       className="rounded-2xl border-border/60 min-h-[100px] bg-background/50 focus-visible:ring-primary/20"
                       value={note}
                       onChange={(e) => setNote(e.target.value)}
                    />
                 </section>

                 {/* Nav buttons */}
                 <div className="flex gap-4 pt-4 border-t border-border/40">
                    <Button 
                       variant="outline" 
                       className="h-14 px-8 rounded-2xl border-border/60 font-bold"
                       onClick={() => setCurrentStep(1)}
                    >
                       Quay lại
                    </Button>
                    <Button 
                       className="flex-1 h-14 bg-foreground hover:bg-foreground/90 text-background font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl transition-all"
                       disabled={selectedSubServiceIds.length === 0 || !selectedTime || !date || (!selectedAddressId && !addressInput) || !!quoteError}
                       onClick={() => setCurrentStep(3)}
                    >
                       Bước tiếp theo <ChevronRight className="w-4 h-4 ml-1 inline" />
                    </Button>
                 </div>
              </motion.div>
            )}

            {/* STEP 3: CHECKOUT & PAYMENT */}
            {currentStep === 3 && (
              <motion.div 
                 initial={{ opacity: 0, y: 15 }} 
                 animate={{ opacity: 1, y: 0 }}
                 className="space-y-10"
              >
                 {/* Voucher Section */}
                 <section className="bg-card border border-border/40 p-8 rounded-[2rem] shadow-sm space-y-6">
                    <h4 className="flex items-center gap-3 font-bold text-lg">
                       <Gift className="w-5 h-5 text-rose-500" /> Nhập mã giảm giá
                    </h4>
                    <div className="flex gap-2">
                       <div className="relative flex-1 group">
                          <Gift className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary" />
                          <Input 
                             placeholder="Mã giảm giá..." 
                             className="pl-11 h-14 rounded-2xl bg-background/50 border-border/60 focus-visible:ring-primary/20 font-bold"
                             value={voucher}
                             onChange={(e) => setVoucher(e.target.value)}
                          />
                       </div>
                       <Button variant="outline" className="h-14 rounded-2xl border-border/60 hover:border-primary px-8">Áp dụng</Button>
                    </div>
                 </section>

                 {/* Payment Methods Selector */}
                 <section className="bg-card border border-border/40 p-8 rounded-[2rem] shadow-sm space-y-6">
                    <h4 className="flex items-center gap-3 font-bold text-lg">
                       <CreditCard className="w-5 h-5 text-violet-500" /> Chọn phương thức thanh toán
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       {PAYMENT_METHODS.map((method) => (
                          <button
                             key={method.id}
                             type="button"
                             onClick={() => setSelectedPayment(method.id)}
                             className={`flex flex-col items-center text-center p-6 rounded-2xl border transition-all ${
                               selectedPayment === method.id
                               ? 'bg-violet-500/5 border-violet-500 ring-1 ring-violet-500/20'
                               : 'bg-background border-border/40 hover:border-violet-500/40'
                             }`}
                          >
                             <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${selectedPayment === method.id ? 'bg-violet-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                                <method.icon className="w-5 h-5" />
                             </div>
                             <span className="text-sm font-bold mb-1">{method.name}</span>
                             <span className="text-[10px] text-muted-foreground leading-relaxed">{method.desc}</span>
                          </button>
                       ))}
                    </div>
                 </section>

                 {/* Navigation buttons at checkout */}
                 <div className="flex gap-4">
                    <Button 
                       variant="outline" 
                       className="h-16 px-8 rounded-2xl border-border/60 font-bold"
                       onClick={() => setCurrentStep(2)}
                    >
                       Quay lại
                    </Button>
                    <Button 
                       className="flex-1 h-16 bg-primary text-primary-foreground font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                       disabled={selectedSubServiceIds.length === 0 || !selectedTime || !date || (!selectedAddressId && !addressInput) || createBookingMutation.isPending || !!quoteError}
                       onClick={handleCreateBooking}
                    >
                       {createBookingMutation.isPending ? (
                         <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
                       ) : (
                         <Zap className="w-5 h-5 text-primary-foreground fill-primary-foreground" />
                       )}
                       {createBookingMutation.isPending ? "Đang xử lý..." : "Xác nhận & Hoàn tất"}
                    </Button>
                 </div>
              </motion.div>
            )}
          </div>

          {/* RIGHT COLUMN: Static Checkout Card (Minh bạch tiền) */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              
              <div className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
                 
                 {/* Shimmer loading overlay */}
                 {(isLoadingQuote || isFetchingQuote) && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-20">
                       <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                 )}

                 <div className="space-y-6">
                    <h4 className="font-bold text-base border-b border-border/40 pb-3 flex items-center gap-2">
                       <ShieldCheck className="w-5 h-5 text-emerald-500" /> Hóa đơn tạm tính
                    </h4>
                    
                    {quoteError ? (
                       <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                             <p className="font-bold">Lỗi tính giá</p>
                             <p className="font-light">{(quoteError as { response?: { data?: { message?: string } } })?.response?.data?.message || "Thông tin đã nhập không hợp lệ hoặc ngoài khu vực hỗ trợ."}</p>
                          </div>
                       </div>
                    ) : null}

                    {/* Breakdown prices */}
                    <div className="space-y-3.5 text-xs">
                       <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Giá gốc dịch vụ</span>
                          <span className="font-bold">{(quoteData?.price?.basePrice || 0).toLocaleString()}đ</span>
                       </div>
                       <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-light">Thời gian dự kiến</span>
                          <span className="font-bold">{totalDurationHours} giờ</span>
                       </div>
                       {(quoteData?.price?.addonPrice !== undefined && quoteData.price.addonPrice > 0) && (
                          <div className="flex items-center justify-between">
                             <span className="text-muted-foreground font-light">Phí dịch vụ con</span>
                             <span className="font-bold">+{quoteData.price.addonPrice.toLocaleString()}đ</span>
                          </div>
                       )}
                       {(quoteData?.price?.peakFee !== undefined && quoteData.price.peakFee > 0) && (
                          <div className="flex items-center justify-between text-amber-500">
                             <span className="font-medium flex items-center gap-1"><Zap className="w-3.5 h-3.5 fill-current" /> Phụ thu ngày lễ/tết</span>
                             <span className="font-bold">+{quoteData.price.peakFee.toLocaleString()}đ</span>
                          </div>
                       )}
                       {(quoteData?.price?.petFee !== undefined && quoteData.price.petFee > 0) && (
                          <div className="flex items-center justify-between text-emerald-500 font-medium">
                             <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> Phụ thu nhà có thú cưng</span>
                             <span className="font-bold">+{quoteData.price.petFee.toLocaleString()}đ</span>
                          </div>
                       )}
                       {(quoteData?.price?.waitingFee !== undefined && quoteData.price.waitingFee > 0) && (
                          <div className="flex items-center justify-between">
                             <span className="text-muted-foreground">Phí chờ đợi</span>
                             <span className="font-bold">+{quoteData.price.waitingFee.toLocaleString()}đ</span>
                          </div>
                       )}
                       {(quoteData?.price?.discountAmount !== undefined && quoteData.price.discountAmount > 0) && (
                         <div className="flex items-center justify-between text-rose-500 font-bold">
                            <span className="flex items-center gap-1"><Gift className="w-3.5 h-3.5" /> Khuyến mãi áp dụng</span>
                            <span className="font-bold">-{quoteData.price.discountAmount.toLocaleString()}đ</span>
                         </div>
                       )}
                    </div>

                    {/* Total balance box */}
                    <div className="bg-primary p-6 rounded-2xl text-primary-foreground shadow-lg shadow-primary/20 relative overflow-hidden group">
                       <div className="flex items-end justify-between relative z-10">
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Tổng cộng</span>
                          <div className="text-right">
                             <p className="text-2xl md:text-3xl font-black leading-none">
                               {(quoteData?.price?.totalPrice || 0).toLocaleString()}đ
                             </p>
                             <p className="text-[8px] font-black uppercase mt-1.5 opacity-60">
                                Thanh toán bằng {
                                  selectedPayment === 'CASH' ? 'Tiền mặt' : 'Ví CleanZ'
                                }
                             </p>
                          </div>
                       </div>
                       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </div>

                    {/* Navigation inside Desktop Card */}
                    {currentStep < 3 && (
                       <Button
                          className="w-full h-14 bg-foreground hover:bg-foreground/90 text-background font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1"
                          disabled={selectedSubServiceIds.length === 0 || (currentStep === 2 && (!selectedTime || !date || (!selectedAddressId && !addressInput))) || !!quoteError}
                          onClick={() => setCurrentStep(currentStep + 1)}
                       >
                          Bước tiếp theo <ChevronRight className="w-4 h-4" />
                       </Button>
                    )}
                    {currentStep > 1 && currentStep < 3 && (
                       <Button
                          variant="ghost"
                          className="w-full h-10 text-muted-foreground hover:text-foreground font-medium text-xs rounded-xl"
                          onClick={() => setCurrentStep(currentStep - 1)}
                       >
                          Quay lại bước trước
                       </Button>
                    )}
                 </div>
              </div>

              {/* Secure badge */}
              <div className="flex items-center justify-center gap-2 text-muted-foreground/40">
                 <ShieldCheck className="w-3.5 h-3.5" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Bảo mật SSL 256-bit</span>
              </div>

            </div>
          </div>

        </div>
      </Container>

      {/* MOBILE STICKY SUMMARY BOTTOM BAR */}
      {currentStep < 3 && (
         <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-2xl border-t border-border/40 p-5 md:hidden">
            <div className="flex items-center justify-between gap-6">
               <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 mb-1">Tạm tính</span>
                  <div className="flex items-baseline gap-1">
                     <p className="text-2xl font-black text-primary">
                       {(quoteData?.price?.totalPrice || 0).toLocaleString()}đ
                     </p>
                     <span className="text-[8px] font-medium opacity-40">NET</span>
                  </div>
               </div>
               <Button 
                  className="flex-1 h-14 bg-primary text-primary-foreground font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/30 flex items-center justify-center gap-1"
                  disabled={selectedSubServiceIds.length === 0 || (currentStep === 2 && (!selectedTime || !date || (!selectedAddressId && !addressInput))) || !!quoteError}
                  onClick={() => setCurrentStep(currentStep + 1)}
               >
                  Tiếp tục <ChevronRight className="w-4 h-4" />
               </Button>
            </div>
         </div>
      )}

      {/* 3. SUB SERVICE DETAIL DRAWER */}
      <Drawer open={!!detailSubService} onOpenChange={(open) => !open && setDetailSubService(null)}>
        <DrawerContent className="max-h-[85vh] p-6">
          {detailSubService && (
            <div className="space-y-6">
              <DrawerHeader className="px-0">
                <DrawerTitle className="text-xl font-bold text-primary">{detailSubService.name}</DrawerTitle>
                {detailSubService.shortDescription && (
                  <DrawerDescription className="text-muted-foreground mt-1">{detailSubService.shortDescription}</DrawerDescription>
                )}
              </DrawerHeader>
              
              {/* Inclusions & Exclusions for SubService */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                 <div className="space-y-4">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-emerald-500">
                       <CheckCircle2 className="w-4 h-4" /> Công việc thực hiện
                    </h4>
                    <ul className="space-y-2">
                       {detailSubService.includedTasks && detailSubService.includedTasks.length > 0 ? (
                          detailSubService.includedTasks.map((item: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-xs font-light leading-relaxed">
                               <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /> <span>{item}</span>
                            </li>
                          ))
                       ) : (
                         <li className="text-xs text-muted-foreground italic font-light">Thực hiện theo yêu cầu chuẩn</li>
                       )}
                    </ul>
                 </div>
                 
                 <div className="space-y-4">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-rose-500">
                       <XCircle className="w-4 h-4" /> Lưu ý đặc biệt
                    </h4>
                    <ul className="space-y-2">
                       {detailSubService.excludedTasks && detailSubService.excludedTasks.length > 0 ? (
                          detailSubService.excludedTasks.map((item: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-xs font-light text-muted-foreground/60 leading-relaxed">
                               <Minus className="w-3.5 h-3.5 opacity-40 shrink-0 mt-0.5" /> <span>{item}</span>
                            </li>
                          ))
                       ) : (
                         <li className="text-xs text-muted-foreground italic font-light">Không có giới hạn cụ thể</li>
                       )}
                    </ul>
                 </div>
              </div>

              <DrawerFooter className="px-0 pt-4 border-t border-border/40">
                <DrawerClose asChild>
                  <Button className="w-full h-12 rounded-xl" onClick={() => setDetailSubService(null)}>
                     Đóng chi tiết
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {/* 4. MAIN SERVICE DETAIL DRAWER */}
      <Drawer open={isMainDescDrawerOpen} onOpenChange={setIsMainDescDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          <Container className="px-6 pb-8 overflow-y-auto max-w-xl mx-auto space-y-6">
            <DrawerHeader className="px-0 pb-4 border-b border-border/40">
              <DrawerTitle className="text-xl font-bold text-left">{serviceDetail.title}</DrawerTitle>
              <DrawerDescription className="text-left">Chi tiết dịch vụ và các chính sách đi kèm</DrawerDescription>
            </DrawerHeader>
            
            <div className="space-y-6 py-4">
              {/* Phần Mô tả chi tiết */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-foreground">Giới thiệu dịch vụ</h4>
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {serviceDetail.description}
                </p>
              </div>

              {/* Phần Chính sách (Nếu có) */}
              {serviceDetail.policyDescription && (
                <div className="space-y-2 pt-4 border-t border-border/40">
                  <h4 className="text-sm font-bold text-rose-500">Chính sách & Quy định bồi hoàn</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {serviceDetail.policyDescription}
                  </p>
                </div>
              )}
            </div>

            <DrawerFooter className="px-0 pt-4 border-t border-border/40 flex flex-row gap-4">
              <DrawerClose asChild>
                <Button className="w-full h-12 rounded-xl font-bold bg-foreground text-background hover:bg-foreground/90">
                  Đóng
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </Container>
        </DrawerContent>
      </Drawer>

    </div>
  );
}
