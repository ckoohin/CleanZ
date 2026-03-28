/* eslint-disable react-refresh/only-export-components */
import Container from '@/components/Container'
import { Flame, CalendarCheck, Search, Star, Shield, Clock, ChevronRight } from 'lucide-react'
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

export type THeroService = {
    id: number | string;
    title: string;
    highlight: string;
    description: string;
    image: string;
    status: string;
    statusColor: string;
    bookingUrl: string;
    stats: { label: string; value: string }[];
    tag: string;
};

export const heroServices: THeroService[] = [
    {
        id: 1,
        title: "VỆ SINH",
        highlight: "TOÀN NHÀ",
        description: "Dọn dẹp chuyên sâu từng góc nhà — bếp, phòng ngủ, nhà tắm. Đội ngũ được đào tạo bài bản, thiết bị hiện đại, sạch chuẩn khách sạn.",
        image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1920&q=85",
        status: "Phổ Biến Nhất",
        statusColor: "bg-emerald-500",
        bookingUrl: "/booking/cleaning",
        stats: [{ label: "Đánh giá", value: "4.9★" }, { label: "Đã đặt", value: "12k+" }, { label: "Từ", value: "150k" }],
        tag: "Vệ sinh",
    },
    {
        id: 2,
        title: "SỬA CHỮA",
        highlight: "ĐIỆN NƯỚC",
        description: "Thợ lành nghề, có chứng chỉ, xử lý nhanh mọi sự cố điện — nước tại nhà. Cam kết đúng giờ, báo giá minh bạch trước khi làm.",
        image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1920&q=85",
        status: "Đặt Ngay",
        statusColor: "bg-blue-500",
        bookingUrl: "/booking/repair",
        stats: [{ label: "Đánh giá", value: "4.8★" }, { label: "Thợ", value: "350+" }, { label: "Từ", value: "200k" }],
        tag: "Sửa chữa",
    },
    {
        id: 3,
        title: "MASSAGE",
        highlight: "TẠI NHÀ",
        description: "Chuyên viên massage được chứng nhận đến tận nhà bạn. Thư giãn hoàn toàn sau ngày dài làm việc, không cần ra khỏi nhà.",
        image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1920&q=85",
        status: "Hot Tuần Này",
        statusColor: "bg-rose-500",
        bookingUrl: "/booking/massage",
        stats: [{ label: "Đánh giá", value: "5.0★" }, { label: "Buổi", value: "8k+" }, { label: "Từ", value: "250k" }],
        tag: "Sức khoẻ",
    },
    {
        id: 4,
        title: "GIA SƯ",
        highlight: "TẠI NHÀ",
        description: "Kết nối với gia sư uy tín cho mọi cấp độ và môn học. Lịch học linh hoạt, theo dõi tiến độ minh bạch, hiệu quả được cam kết.",
        image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1920&q=85",
        status: "Đang Ưu Đãi",
        statusColor: "bg-amber-500",
        bookingUrl: "/booking/tutor",
        stats: [{ label: "Đánh giá", value: "4.9★" }, { label: "Gia sư", value: "500+" }, { label: "Từ", value: "180k" }],
        tag: "Giáo dục",
    },
    {
        id: 5,
        title: "CHĂM SÓC",
        highlight: "SẮC ĐẸP",
        description: "Nail, cắt tóc, chăm sóc da tại nhà bởi chuyên viên được đào tạo chính quy. Mang cả salon đến tận nơi bạn muốn.",
        image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1920&q=85",
        status: "Top Đánh Giá",
        statusColor: "bg-pink-500",
        bookingUrl: "/booking/beauty",
        stats: [{ label: "Đánh giá", value: "4.9★" }, { label: "Lượt", value: "6k+" }, { label: "Từ", value: "120k" }],
        tag: "Làm đẹp",
    },
    {
        id: 6,
        title: "HUẤN LUYỆN",
        highlight: "CÁ NHÂN",
        description: "Personal trainer đến nhà hoặc tại gym gần bạn. Lịch tập cá nhân hóa, theo dõi chỉ số sức khỏe, đạt mục tiêu nhanh hơn.",
        image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1920&q=85",
        status: "Đang Chiêu Sinh",
        statusColor: "bg-orange-500",
        bookingUrl: "/booking/fitness",
        stats: [{ label: "Đánh giá", value: "4.8★" }, { label: "Trainer", value: "120+" }, { label: "Từ", value: "300k" }],
        tag: "Fitness",
    },
    {
        id: 7,
        title: "SỬA ĐIỀU",
        highlight: "HÒA",
        description: "Vệ sinh, nạp gas, sửa chữa điều hòa tất cả hãng. Thợ có kinh nghiệm 5+ năm, bảo hành 30 ngày, giá cạnh tranh.",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=85",
        status: "Yêu Cầu Nhiều",
        statusColor: "bg-cyan-500",
        bookingUrl: "/booking/hvac",
        stats: [{ label: "Đánh giá", value: "4.7★" }, { label: "Lượt sửa", value: "9k+" }, { label: "Từ", value: "200k" }],
        tag: "Điện lạnh",
    },
    {
        id: 8,
        title: "ĐIỀU DƯỠNG",
        highlight: "TẠI NHÀ",
        description: "Dịch vụ y tế tại nhà — điều dưỡng, thay băng, tiêm thuốc, chăm sóc người cao tuổi. Đội ngũ y tế chuyên nghiệp.",
        image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1920&q=85",
        status: "Đáng Tin Cậy",
        statusColor: "bg-teal-500",
        bookingUrl: "/booking/nursing",
        stats: [{ label: "Đánh giá", value: "5.0★" }, { label: "Điều dưỡng", value: "80+" }, { label: "Từ", value: "350k" }],
        tag: "Y tế",
    },
];

const INTERVAL = 5500;

const HeroCarousel = () => {
    const [current, setCurrent] = useState(0);
    const [progress, setProgress] = useState(0);
    const progressRef = useRef<NodeJS.Timeout | null>(null);
    const slides = heroServices;

    const goTo = (index: number) => {
        setCurrent(index);
        setProgress(0);
    };

    useEffect(() => {
        setProgress(0);
        const step = 100 / (INTERVAL / 50);
        progressRef.current = setInterval(() => {
            setProgress((p) => {
                if (p >= 100) {
                    setCurrent((c) => (c + 1) % slides.length);
                    return 0;
                }
                return p + step;
            });
        }, 50);
        return () => clearInterval(progressRef.current!);
    }, [current]);

    const slide = slides[current];

    return (
        <div className="relative w-full h-[100vh] overflow-hidden bg-black">

            {/* ── BG IMAGE with Ken Burns ── */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={current}
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 1.08 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                >
                    <img
                        src={slide.image}
                        alt={slide.title}
                        className="w-full h-full object-cover"
                    />
                    {/* Multi-layer overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                </motion.div>
            </AnimatePresence>

            {/* ── CONTENT ── */}
            <div className="relative z-10 h-full flex flex-col justify-center max-w-7xl mx-auto px-6 md:px-12">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={current}
                        className="max-w-2xl"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        {/* Status pill */}
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15, duration: 0.5 }}
                            className="flex items-center gap-3 mb-7"
                        >
                            <span className={cn("w-2 h-2 rounded-full animate-pulse", slide.statusColor)} />
                            <span className="text-white/70 text-xs font-bold uppercase tracking-[0.25em]">
                                {slide.tag}
                            </span>
                            <span className="h-px w-8 bg-white/30" />
                            <span className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em] text-white",
                                slide.statusColor
                            )}>
                                <Flame className="w-3 h-3" />
                                {slide.status}
                            </span>
                        </motion.div>

                        {/* Title */}
                        <motion.h1
                            initial={{ opacity: 0, y: 28 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.55 }}
                            className="text-6xl md:text-8xl font-black text-white leading-[0.88] mb-6 tracking-tighter uppercase"
                        >
                            {slide.title}
                            <br />
                            <span className="text-primary italic drop-shadow-[0_0_30px_rgba(99,102,241,0.5)]">
                                {slide.highlight}
                            </span>
                        </motion.h1>

                        {/* Desc */}
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.27, duration: 0.5 }}
                            className="text-base md:text-lg text-white/70 max-w-lg mb-8 leading-relaxed"
                        >
                            {slide.description}
                        </motion.p>

                        {/* Stats row */}
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.32, duration: 0.5 }}
                            className="flex items-center gap-6 mb-10"
                        >
                            {slide.stats.map((s, i) => (
                                <div key={i} className="flex flex-col">
                                    <span className="text-xl font-black text-white">{s.value}</span>
                                    <span className="text-[10px] text-white/50 uppercase tracking-widest font-semibold">{s.label}</span>
                                </div>
                            ))}
                            <div className="h-8 w-px bg-white/15 mx-1" />
                            <div className="flex items-center gap-1.5 text-white/50 text-xs">
                                <Shield className="w-3.5 h-3.5 text-primary" />
                                Bảo hiểm công việc
                            </div>
                        </motion.div>

                        {/* Buttons */}
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.36, duration: 0.5 }}
                            className="flex flex-wrap gap-4"
                        >
                            <a href={slide.bookingUrl}>
                                <button className="group relative overflow-hidden bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-full font-black text-sm transition-all flex items-center gap-3 shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 uppercase tracking-widest">
                                    <CalendarCheck className="w-4 h-4" />
                                    Đặt Dịch Vụ Ngay
                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    {/* shine sweep */}
                                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                </button>
                            </a>
                            <a href="/services">
                                <button className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 px-8 py-4 rounded-full font-black text-sm transition-all flex items-center gap-3 hover:scale-105 active:scale-95 uppercase tracking-widest">
                                    <Search className="w-4 h-4" />
                                    Khám Phá Dịch Vụ
                                </button>
                            </a>
                        </motion.div>

                        {/* Trust row */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.45, duration: 0.5 }}
                            className="mt-8 flex items-center gap-5 text-xs text-white/40 font-medium"
                        >
                            <span className="flex items-center gap-1.5">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                Đánh giá trung bình 4.9/5
                            </span>
                            <span className="h-3 w-px bg-white/20" />
                            <span className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-primary" />
                                Phản hồi trong 30 phút
                            </span>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* ── THUMBNAIL STRIP + PROGRESS (desktop right) ── */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 z-20 hidden lg:flex flex-col gap-3">
                {slides.map((s, i) => (
                    <button
                        key={s.id}
                        onClick={() => goTo(i)}
                        className="group relative flex items-center gap-3"
                    >
                        {/* progress bar left of active */}
                        <div className={cn(
                            "absolute -left-5 top-1/2 -translate-y-1/2 w-1 rounded-full transition-all duration-300 bg-white/20",
                            i === current ? "h-14" : "h-6 group-hover:h-8"
                        )}>
                            {i === current && (
                                <div
                                    className="w-full rounded-full bg-primary transition-none"
                                    style={{ height: `${progress}%` }}
                                />
                            )}
                        </div>

                        {/* Thumbnail */}
                        <div className={cn(
                            "rounded-xl overflow-hidden transition-all duration-300 border-2",
                            i === current
                                ? "w-20 h-14 border-primary shadow-lg shadow-primary/30"
                                : "w-14 h-10 border-transparent opacity-50 group-hover:opacity-80"
                        )}>
                            <img src={s.image} alt={s.title} className="w-full h-full object-cover" />
                        </div>

                        {/* Label (active only) */}
                        {i === current && (
                            <div className="hidden xl:flex flex-col items-start">
                                <span className="text-white text-[10px] font-black uppercase tracking-wider leading-tight">
                                    {s.title}
                                </span>
                                <span className="text-primary text-[10px] font-bold uppercase italic leading-tight">
                                    {s.highlight}
                                </span>
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* ── DOT INDICATORS (mobile / tablet bottom) ── */}
            <div className="absolute bottom-8 inset-x-0 flex justify-center gap-2 lg:hidden z-20">
                {slides.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => goTo(i)}
                        aria-label={`Slide ${i + 1}`}
                        className="relative h-1.5 rounded-full overflow-hidden transition-all duration-300 bg-white/30"
                        style={{ width: i === current ? 32 : 8 }}
                    >
                        {i === current && (
                            <div
                                className="absolute inset-y-0 left-0 bg-primary rounded-full"
                                style={{ width: `${progress}%` }}
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* ── SCROLL HINT ── */}
            <motion.div
                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 hidden lg:flex flex-col items-center gap-2"
                animate={{ y: [0, 6, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
                <span className="text-white/30 text-[10px] uppercase tracking-[0.25em] font-semibold">Cuộn xuống</span>
                <div className="w-px h-8 bg-gradient-to-b from-white/30 to-transparent" />
            </motion.div>
        </div>
    );
};

export default HeroCarousel;