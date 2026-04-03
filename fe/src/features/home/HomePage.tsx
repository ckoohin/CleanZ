import {
  Wrench, Sparkles, Scissors, HeartPulse, BookOpen, Dumbbell,
  CreditCard, UserCheck, Award,
} from "lucide-react";

import { CategorySection, CategoryItem } from "@/features/home/_components/CategoriesSection";
import { ServiceItem } from "@/features/home/_components/ServicesSection";
import { ServicesSection } from "@/features/services/_components/ServicesSection";
import { WhyUsSection, WhyUsItem, StatItem } from "@/features/home/_components/WhyUsSection";
import { CtaSection } from "@/features/home/_components/CtaSection";
import HeroSection from "./_components/HeroSection";
import HeroCarousel from "./_components/HeroCarousel";

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
  {
    id: 4,
    title: "Yoga Hatha cá nhân",
    desc: "Buổi 1-1 tập trung vào căn chỉnh tư thế, kỹ thuật thở và sự rõ ràng tinh thần.",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80",
    tag: "Sức khỏe", rating: "4.8", reviews: "210",
    price: "250.000đ", unit: "/ giờ", duration: "60 phút",
    bookingUrl: "/booking/yoga",
  },
  {
    id: 5,
    title: "Yoga Hatha cá nhân",
    desc: "Buổi 1-1 tập trung vào căn chỉnh tư thế, kỹ thuật thở và sự rõ ràng tinh thần.",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80",
    tag: "Sức khỏe", rating: "4.8", reviews: "210",
    price: "250.000đ", unit: "/ giờ", duration: "60 phút",
    bookingUrl: "/booking/yoga",
  },
];

const WHY_US_ITEMS: WhyUsItem[] = [
  { icon: CreditCard, title: "Báo giá minh bạch", desc: "Không phí ẩn hay tính giờ bất ngờ. Bạn biết chi phí trước khi đặt lịch." },
  { icon: UserCheck, title: "Thợ được kiểm duyệt", desc: "Chỉ top 3% chuyên viên vượt qua vòng kiểm tra lý lịch và kỹ năng nhiều bước." },
  { icon: Award, title: "Cam kết hoàn tiền", desc: "Không hài lòng? Chúng tôi sẽ xử lý hoặc hoàn tiền. Không cần giải thích." },
];

const STATS: StatItem[] = [
  { value: "10k+", label: "Đánh giá 5 sao", variant: "primary" },
  { value: "24h", label: "Phản hồi nhanh", variant: "default" },
];

const WHY_IMAGES = [
  { src: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80", alt: "Đội ngũ dịch vụ" },
  { src: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80", alt: "Không gian sạch sẽ" },
];

export default function HomePagee() {
  return (
    <div className="min-h-screen bg-background">

      {/* HERO CAROUSEL */}
      <HeroCarousel />
      {/* hero section */}
      <HeroSection />

      <CategorySection
        items={CATEGORIES}
        className="max-w-7xl mx-auto px-6 -mt-16 relative z-20 mb-24"
      />

      <ServicesSection
        services={SERVICES}
      />

      {/* Why choose us */}
      <WhyUsSection
        badge="Vì sao chọn chúng tôi"
        title="Dịch vụ được định nghĩa lại qua"
        titleHighlight="sự rõ ràng"
        items={WHY_US_ITEMS}
        stats={STATS}
        images={WHY_IMAGES}
        className="bg-muted/40 border-y border-border py-24"
      />

      {/* CTA */}
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