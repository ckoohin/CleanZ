"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

const slidesSignUp = [
  {
    image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=1200",
    title: "Không Gian Hoàn Mỹ",
    description: "Tận hưởng không gian sống sạch sẽ, gọn gàng và tinh tươm mỗi ngày.",
  },
  {
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=1200",
    title: "Trải Nghiệm Đẳng Cấp",
    description: "Mang tiêu chuẩn dọn dẹp khách sạn 5 sao vào chính ngôi nhà của bạn.",
  },
  {
    image: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80&w=1200",
    title: "Bếp Nấu Sáng Bóng",
    description: "Làm sạch chuyên sâu không gian bếp, trả lại sự bóng bẩy nguyên bản.",
  },
  {
    image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=1200",
    title: "Phòng Ngủ Thư Giãn",
    description: "Sắp xếp lại không gian nghỉ ngơi, mang lại giấc ngủ sâu và trọn vẹn.",
  },
  {
    image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&q=80&w=1200",
    title: "Tổ Ấm Yêu Thương",
    description: "Giải phóng thời gian dọn dẹp để bạn dành trọn vẹn cho gia đình.",
  },
];

const slidesSignIn = [
  {
    image: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&q=80&w=1200",
    title: "Môi Trường Trong Lành",
    description: "Không gian thoáng đãng, sạch sẽ giúp bảo vệ sức khỏe cho cả gia đình bạn.",
  },
  {
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=1200",
    title: "Vệ Sinh Chuyên Sâu",
    description: "Đánh bay mọi vết bẩn cứng đầu với quy trình làm sạch chuẩn 5 sao.",
  },
  {
    image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&q=80&w=1200",
    title: "Nội Thất Sáng Bóng",
    description: "Dịch vụ giặt sofa, rèm cửa, nệm giúp diệt khuẩn và khử mùi hiệu quả.",
  },
  {
    image: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80&w=1200",
    title: "Tiết Kiệm Thời Gian",
    description: "Thảnh thơi tận hưởng cuộc sống, việc dọn dẹp nhà cửa đã có CleanZ lo.",
  },
  {
    image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=1200",
    title: "Chất Lượng Uy Tín",
    description: "Đội ngũ nhân viên giàu kinh nghiệm, tận tâm mang lại sự hài lòng tuyệt đối.",
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
              CleanZ
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
