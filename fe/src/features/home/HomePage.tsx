import {
  Wrench,
  Sparkles,
  Scissors,
  HeartPulse,
  BookOpen,
  Dumbbell,
  CreditCard,
  UserCheck,
  Award,
} from "lucide-react";

import { CategorySection } from "@/features/home/_components/CategoriesSection";
import { ServicesSection } from "@/features/services/_components/ServicesSection";
import { WhyUsSection } from "@/features/home/_components/WhyUsSection";
import { CtaSection } from "@/features/home/_components/CtaSection";
import HeroCarousel from "@/features/home/_components/HeroCarousel";
import HeroSection from "@/features/home/_components/HeroSection";
import { CategoryItem } from "./types/category.type";
import { ServiceItem } from "./types/service.type";
import { StatItem, WhyUsItem } from "./types/whyUsSection.type";


const CATEGORIES: CategoryItem[] = [
  { icon: Sparkles, label: "Dọn theo giờ", color: "bg-emerald-50 text-emerald-600", href: "/customer" },
  { icon: Wrench, label: "Tổng vệ sinh", color: "bg-blue-50 text-blue-600", href: "/customer" },
  { icon: HeartPulse, label: "Giặt Sofa/Nệm", color: "bg-rose-50 text-rose-600", href: "/customer" },
  { icon: Scissors, label: "Vệ sinh rèm", color: "bg-purple-50 text-purple-600", href: "/customer" },
  { icon: BookOpen, label: "Tạp vụ VP", color: "bg-amber-50 text-amber-600", href: "/customer" },
  { icon: UserCheck, label: "Vệ sinh kính", color: "bg-cyan-50 text-cyan-600", href: "/customer" },
];

const SERVICES: ServiceItem[] = [
  {
    id: 1,
    title: "Dọn dẹp nhà theo giờ",
    desc: "Giải pháp dọn dẹp linh hoạt, đặt lịch nhanh chóng. Người giúp việc có mặt sau 60 phút, dọn sạch mọi ngóc ngách.",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80",
    tag: "Phổ biến nhất", rating: "4.9", reviews: "12.5k",
    price: "70.000đ", unit: "/ giờ", duration: "Từ 2 giờ",
    bookingUrl: "/customer",
  },
  {
    id: 2,
    title: "Tổng vệ sinh chuyên sâu",
    desc: "Làm sạch toàn diện nhà mới xây, nhà lâu ngày không dọn. Bao gồm máy móc chuyên dụng và dung dịch tẩy rửa.",
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80",
    tag: "Chuyên sâu", rating: "5.0", reviews: "3.2k",
    price: "150.000đ", unit: "/ buổi", duration: "4–8 giờ",
    bookingUrl: "/customer",
  },
  {
    id: 3,
    title: "Giặt Sofa & Nệm tại nhà",
    desc: "Giặt sạch vết bẩn, khử mùi và diệt khuẩn 99% bằng công nghệ phun hút hơi nước nóng 140 độ C.",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80",
    tag: "Bảo vệ sức khoẻ", rating: "4.8", reviews: "8.1k",
    price: "250.000đ", unit: "/ bộ", duration: "1.5–2 giờ",
    bookingUrl: "/customer",
  },
  {
    id: 4,
    title: "Vệ sinh sau xây dựng",
    desc: "Làm sạch triệt để xi măng, sơn thừa, bụi mịn công trình. Đội ngũ đông đảo, thiết bị công nghiệp công suất lớn.",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80",
    tag: "Dự án mới", rating: "4.9", reviews: "1.2k",
    price: "15.000đ", unit: "/ m2", duration: "1-2 ngày",
    bookingUrl: "/customer",
  },
  {
    id: 5,
    title: "Vệ sinh rèm cửa",
    desc: "Tháo lắp giặt sấy tận xưởng hoặc giặt hơi nước tại nhà. Trả lại phom dáng chuẩn và hương thơm tươi mát cho rèm.",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80",
    tag: "Làm sạch", rating: "4.7", reviews: "5.5k",
    price: "120.000đ", unit: "/ kg", duration: "Trong ngày",
    bookingUrl: "/customer",
  },
  {
    id: 6,
    title: "Tạp vụ văn phòng",
    desc: "Cung cấp nhân sự vệ sinh văn phòng chuyên nghiệp, đảm bảo không gian làm việc xanh - sạch - đẹp mỗi ngày.",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    tag: "Dành cho DN", rating: "4.9", reviews: "900+",
    price: "65.000đ", unit: "/ giờ", duration: "Định kỳ",
    bookingUrl: "/customer",
  },
];

const WHY_US = [
  {
    icon: CreditCard,
    title: "Giá cả minh bạch",
    desc: "Hiển thị chi tiết và chính xác giá tiền ngay trên ứng dụng. Bạn không cần phải trả thêm bất kỳ khoản phụ phí nào.",
  },
  {
    icon: UserCheck,
    title: "Người làm chuẩn mực",
    desc: "100% nhân viên có hồ sơ lý lịch rõ ràng, được đào tạo bài bản về kỹ năng nghề nghiệp và giao tiếp.",
  },
  {
    icon: Award,
    title: "An toàn & Bảo hiểm",
    desc: "CleanZ bảo vệ quyền lợi của bạn với chính sách bảo hiểm hư hỏng, mất mát tài sản lên đến 100 triệu đồng.",
  },
];

const STATS: StatItem[] = [
  { value: "2 Triệu+", label: "Giờ làm việc" },
  { value: "4.9/5", label: "Điểm đánh giá" },
  { value: "100.000+", label: "Khách hàng tin dùng" },
];

const WHY_IMAGES = [
  { src: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80", alt: "Nhân viên dọn dẹp" },
  { src: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80", alt: "Thiết bị chuyên dụng" },
  { src: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800&q=80", alt: "An tâm tuyệt đối" },
];



export default function HomePagee() {
  return (
    <>
      <HeroCarousel />
      <HeroSection />
      <CategorySection items={CATEGORIES} />
      <ServicesSection services={SERVICES} />
      <CtaSection
        title="Thảnh thơi tận hưởng cuộc sống"
        subtitle="Hơn 100.000 gia đình Việt Nam đã tin tưởng giao phó việc nhà cho CleanZ."
        primaryLabel="Trải nghiệm ngay"
        primaryHref="/customer"
        secondaryLabel="Tìm hiểu thêm"
        secondaryHref="/about"
        image="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1000&q=80"
        stat="100.000+"
        className="mx-auto my-12 md:my-28"
      />
      <WhyUsSection
        badge="Vì sao chọn CleanZ"
        title="Tiêu chuẩn dọn dẹp hàng đầu"
        titleHighlight="Đông Nam Á"
        items={WHY_US}
        stats={STATS}
        images={WHY_IMAGES}
        className="bg-muted/40 border-y border-border py-12 md:py-24"
      />
    </>
  );
}
