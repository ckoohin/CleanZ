"use client"
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    Bell,
    ShoppingCart,
    Search,
    BadgeCheck,
    ShieldCheck,
    Clock,
    ChevronRight,
    Star,
    Wrench,
    Sparkles,
    Scissors,
    HeartPulse,
    BookOpen,
    Dumbbell,
    CreditCard,
    UserCheck,
    Award,
    ArrowRight,
    Globe,
    Mail,
} from "lucide-react";
import HeroCarousel from "@/features/home/_components/HeroCarousel";
import HeroSection from "@/features/home/_components/HeroSection";
import Footer from "@/components/layouts/site/footer/Footer";
import HomePagee from "@/features/home/HomePage";

const CATEGORIES = [
  { icon: Wrench, label: "Sửa chữa", color: "bg-blue-50 text-blue-600" },
  { icon: Sparkles, label: "Dọn dẹp", color: "bg-emerald-50 text-emerald-600" },
  { icon: Scissors, label: "Làm đẹp", color: "bg-rose-50 text-rose-600" },
  { icon: HeartPulse, label: "Sức khỏe", color: "bg-red-50 text-red-600" },
  { icon: BookOpen, label: "Giáo dục", color: "bg-amber-50 text-amber-600" },
  { icon: Dumbbell, label: "Thể thao", color: "bg-violet-50 text-violet-600" },
];

const SERVICES = [
  {
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBYJa6_yPLhaQDrgKaEmjZMDST7JyBmEA9fblgHyXZ7otwSuGS_dDY6Xhvu9d2729z-Je_7BC5XcXZAC1W7z7UEGmYbvUfZMa0TrmKj0_Quqh-6gwu757qacLdDmS-9CfJLEITlRq5bHy-L_e8oq5yLMyrFPGaaqTP7ll5Gs1x4epROHvWrTeKujKFodeFCJZAR-7J7F47os8Kis2MdBxHBF_gcFGKIWPzFsDJySqkdJIKmh0LP2yNlrERIR-Kxm6ZDB-DXwlSb7XCi",
    tag: "Dọn dẹp",
    rating: "4.9",
    reviews: "128",

    title: "Dọn dẹp nhà cửa toàn diện",
    desc: "Vệ sinh toàn bộ bề mặt, làm sạch sâu nhà bếp, phòng tắm và lau kính chi tiết.",

    price: "200000",
    unit: "/ dịch vụ",
    duration: "4–5 giờ",
  },
  {
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDDhprE61-UB8lpmdESjSxM13CFZmZ9z4lTM3sYUMngwrskxeCXPn05IbCuUy9I5ONRf4j1JtBfSm7-iEZQJH0JyyJqXVrEN_BhAlcXyNHaeH9J7-EBeEWj8oQ3gZa6hjZ35EBvqHr2mLrW6O_alc-cZWgw_1a7b3XqdvVcG87jRT0F0zdJJFuJwPFRYPbJb2FUcD7LuoOaxOSuVVWtZ7KMXrCDhWXUE5qz-sNysuwzPbj_5AUgzWy_fojr8fMa8r9AZCWpamDEgOAK",
    tag: "Sửa chữa",
    rating: "5.0",
    reviews: "84",

    title: "Kiểm tra hệ thống điều hòa",
    desc: "Chẩn đoán toàn diện hệ thống làm mát và sưởi để đảm bảo hiệu suất tối ưu.",

    price: "150000",
    unit: "/ lần",
    duration: "1–2 giờ",
  },
  {
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDQu8Cku98gaOWu81NRfJnyihWkEBnVNhHyir_Nm91rP9Qqzq_4cZptAUMnqaiKkibUwafMybN0--XgngY9jzKk9GWorLKo1bDu7YhRboTcfL6vOk50m8NLNDzBHujtWPR7hYn-E-mqFD_NVmxJuWbLf49AxLC2gDvLaCIJ8iC96EYDNxyGGBnH9uDU4vdd2ZNX7d-Or1NJH-b_Vfc9jbOCe5QlViCL_cOc6MEAbiO8zojXnJbIBDSodIH0o9SOALvdgyuo2Yfj_wKL",
    tag: "Sức khỏe",
    rating: "4.8",
    reviews: "210",

    title: "Yoga Hatha cá nhân",
    desc: "Buổi tập 1 kèm 1 tập trung vào tư thế, hơi thở và cải thiện tinh thần.",

    price: "120000",
    unit: "/ giờ",
    duration: "60 phút",
  },
];

const WHY_US = [
  {
    icon: CreditCard,
    title: "Giá minh bạch",
    desc: "Không phí ẩn hay tính giờ bất ngờ. Bạn biết chính xác chi phí trước khi đặt.",
  },
  {
    icon: UserCheck,
    title: "Đối tác chất lượng cao",
    desc: "Chỉ 3% nhà cung cấp xuất sắc vượt qua quy trình kiểm duyệt nhiều bước của chúng tôi.",
  },
  {
    icon: Award,
    title: "Cam kết hài lòng",
    desc: "Không hài lòng? Chúng tôi sẽ xử lý hoặc hoàn tiền cho bạn. Không cần giải thích.",
  },
];

export default function HomePage() {
    return (
        <div className="min-h-screen bg-background font-sans antialiased">
            {/* HERO CAROUSEL */}
            <HeroCarousel />
            {/* hero section */}
            <HeroSection />

            <HomePagee/>
            {/* FOOTER */}
            <Footer />
        </div>
    );
}