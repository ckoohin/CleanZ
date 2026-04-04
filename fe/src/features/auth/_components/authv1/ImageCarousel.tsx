"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

const slidesSignUp = [
  {
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=1920&auto=format&fit=crop",
    title: "Sửa Chữa & Bảo Trì",
    description: "Kết nối thợ điện, nước và điện lạnh lành nghề ngay khi bạn cần.",
  },
  {
    image: "https://govigroup.com/wp-content/uploads/2024/10/don-dep-van-phong-vhe-cleaning.jpg",
    title: "Vệ Sinh & Dọn Dẹp",
    description: "Dịch vụ dọn nhà, giặt sofa, nệm chuyên nghiệp mang lại không gian sạch sẽ.",
  },
  {
    image: "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?q=80&w=1920&auto=format&fit=crop",
    title: "Chăm Sóc & Làm Đẹp",
    description: "Đặt lịch Spa, Salon tóc hoặc Nail tại nhà với trải nghiệm 5 sao.",
  },
  {
    image: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?q=80&w=1920&auto=format&fit=crop",
    title: "Y Tế & Sức Khỏe",
    description: "Dịch vụ điều dưỡng và bác sĩ tại nhà, chăm sóc sức khỏe cho người thân yêu.",
  },
  {
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1920&auto=format&fit=crop",
    title: "Gia Sư Chuyên Nghiệp",
    description: "Tìm kiếm gia sư phù hợp cho mọi cấp học từ tiểu học đến luyện thi đại học.",
  },
];

const slidesSignIn = [
  {
    image: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=1920&auto=format&fit=crop",
    title: "Quản Lý Lịch Hẹn",
    description: "Giao diện lịch trực quan giúp bạn theo dõi và quản lý mọi dịch vụ dễ dàng.",
  },
  {
    image: "https://images.unsplash.com/photo-1556742044-3c52d6e88c62?q=80&w=1920&auto=format&fit=crop",
    title: "Thanh Toán Đa Năng",
    description: "Hỗ trợ Ví điện tử, Banking và QR Check-in an toàn, nhanh chóng.",
  },
  {
    image: "https://images.unsplash.com/photo-1521791136368-7d89c19c39ad?q=80&w=1920&auto=format&fit=crop",
    title: "Kết Nối Thông Minh",
    description: "Hệ thống tự động điều phối thợ gần bạn nhất để đảm bảo thời gian phục vụ.",
  },
  {
    image: "https://images.unsplash.com/photo-1552581234-26160f608093?q=80&w=1920&auto=format&fit=crop",
    title: "Chất Lượng Tin Cậy",
    description: "Đánh giá và phản hồi từ khách hàng giúp nâng cao uy tín cộng đồng thợ.",
  },
  {
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=1920&auto=format&fit=crop",
    title: "Fitness & Sức Trẻ",
    description: "Tìm kiếm huấn luyện viên cá nhân (PT) và các lớp Yoga phù hợp với bạn.",
  },
];

const slideVariants: Variants = {
  initial: { opacity: 0, scale: 1.1 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 1, ease: [0.4, 0, 0.2, 1] as const },
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.6 } },
};

const textVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i, duration: 0.6, ease: "easeOut" },
  }),
};

export function ImageCarousel({ valueAuthType }: { valueAuthType: "signup" | "signin" }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = valueAuthType === "signup" ? slidesSignUp : slidesSignIn;
  const SLIDE_DURATION = 4500;

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentSlide(0);
    }, 0);
    return () => clearTimeout(timer);
  }, [valueAuthType]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="hidden lg:flex lg:flex-1 relative bg-zinc-950 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${valueAuthType}-${currentSlide}`}
          variants={slideVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="absolute inset-0"
        >
          {/* Overlay Gradient chuẩn Zinc */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-[7000ms] ease-linear scale-105"
            style={{ backgroundImage: `url(${slides[currentSlide].image})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-900/40 to-transparent" />
          </div>

          <div className="relative h-full flex flex-col justify-end p-20 text-white">
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-4 inline-block w-fit px-3 py-1 bg-primary/20 backdrop-blur-md border border-primary/30 rounded text-[10px] font-bold tracking-widest uppercase text-primary-foreground"
            >
              Dịch vụ chuyên nghiệp
            </motion.span>

            <motion.div variants={textVariants} initial="hidden" animate="visible" custom={0.2}>
              <h2 className="text-5xl font-extrabold mb-4 tracking-tight leading-[1.1]">
                {slides[currentSlide].title}
              </h2>
            </motion.div>

            <motion.div variants={textVariants} initial="hidden" animate="visible" custom={0.4}>
              <p className="text-xl text-zinc-200 mb-12 max-w-lg font-medium leading-relaxed opacity-90">
                {slides[currentSlide].description}
              </p>
            </motion.div>

            {/* Pagination Indicators dùng màu Primary Indigo */}
            <div className="flex gap-3 items-center">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className="relative h-1.5 rounded-full overflow-hidden bg-white/20 transition-all duration-500"
                  style={{ width: index === currentSlide ? "4rem" : "1.5rem" }}
                >
                  {index === currentSlide && (
                    <motion.div
                      className="absolute inset-0 bg-primary shadow-[0_0_15px_rgba(99,102,241,0.6)]"
                      initial={{ x: "-100%" }}
                      animate={{ x: "0%" }}
                      transition={{ duration: SLIDE_DURATION / 1000, ease: "linear" }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Brand Overlay đồng nhất với theme Zinc */}
      <div className="absolute top-12 left-12 z-10">
        <Link href="/home">
          <div className="group flex items-center gap-3 px-5 py-2.5 rounded-2xl 
          bg-zinc-900/40 backdrop-blur-2xl border border-white/10 shadow-2xl
          transition-all duration-300 hover:bg-zinc-800/60 hover:scale-[1.03] cursor-pointer"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse 
              shadow-[0_0_8px_#6366f1] group-hover:scale-125 transition"
            />

            <span className="text-[12px] font-black text-white uppercase tracking-[0.3em]
              group-hover:flex transition hidden items-center gap-2"
            >
              <ChevronLeft size={18} />
              Trang chủ
            </span>

            <span className="text-[12px] group-hover:hidden font-black text-white uppercase tracking-[0.3em]
              group-hover:text-primary transition"
            >
              King Of Service
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}