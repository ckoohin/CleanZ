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
import { ServicesSection } from "@/features/services/_components/ServicesSection";
import CategorySection from "@/features/services/_components/CategorySection";
import { CategoryItem } from "@/features/services/types/service.type";
import { CtaSection } from "@/features/home/_components/CtaSection";
import Container from "@/components/Container";
import { ServiceItem } from "@/features/home/types/service.type";

const CATEGORIES: CategoryItem[] = [
    { icon: Wrench, label: "Sửa chữa", color: "bg-blue-50 text-blue-600", href: "/services/repair" },
    { icon: Sparkles, label: "Dọn dẹp", color: "bg-emerald-50 text-emerald-600", href: "/services/cleaning" },
    { icon: Scissors, label: "Làm đẹp", color: "bg-rose-50 text-rose-600", href: "/services/beauty" },
    { icon: HeartPulse, label: "Sức khỏe", color: "bg-red-50 text-red-600", href: "/services/health" },
    { icon: BookOpen, label: "Gia sư", color: "bg-amber-50 text-amber-600", href: "/services/tutor" },
    { icon: Dumbbell, label: "Fitness", color: "bg-violet-50 text-violet-600", href: "/services/fitness" },
];

const SERVICES: ServiceItem[] = [
    {
        id: 1,
        title: "Dọn nhà chuyên sâu",
        desc: "Vệ sinh toàn diện mọi bề mặt, bếp và phòng tắm sáng bóng, lau kính đến từng chi tiết.",
        image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80",
        tag: "Dọn dẹp", rating: "4.9", reviews: "128",
        price: "150.000đ", unit: "/ buổi", duration: "3–4 giờ",
        bookingUrl: "/booking/cleaning",
    },
    {
        id: 2,
        title: "Kiểm tra điều hòa",
        desc: "Chẩn đoán toàn bộ hệ thống làm lạnh và sưởi ấm, đảm bảo hiệu suất tối đa.",
        image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80",
        tag: "Sửa chữa", rating: "5.0", reviews: "84",
        price: "200.000đ", unit: "/ lần", duration: "1–2 giờ",
        bookingUrl: "/booking/hvac",
    },
    {
        id: 3,
        title: "Yoga Hatha cá nhân",
        desc: "Buổi 1-1 tập trung vào căn chỉnh tư thế, kỹ thuật thở và sự rõ ràng tinh thần.",
        image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80",
        tag: "Sức khỏe", rating: "4.8", reviews: "210",
        price: "250.000đ", unit: "/ giờ", duration: "60 phút",
        bookingUrl: "/booking/yoga",
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
            {/* <HeroCarousel /> */}

            <CategorySection
                items={CATEGORIES}
                className="max-w-7xl mx-auto px-6 -mt-16 relative z-20 mb-24"
            />

            <HeroSection />

            <ServicesSection
                services={SERVICES}
            />
            
            <CtaSection
                title="Sẵn sàng tìm chuyên viên hoàn hảo?"
                subtitle="Hơn 50.000 gia đình tin tưởng King of Service cho nhu cầu hàng ngày."
                primaryLabel="Đặt dịch vụ ngay"
                primaryHref="/services"
                secondaryLabel="Xem bảng giá"
                secondaryHref="/pricing"
                image="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1000&q=80"
                stat="50.000+"
                className="mx-auto my-28"
            />
        </div>
    );
}