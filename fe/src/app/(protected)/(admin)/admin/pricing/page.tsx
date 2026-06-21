import PricingClient from "@/features/admin/components/pricing/PricingClient";

export const metadata = {
  title: "Quản lý Bảng giá | CleanZ Admin",
  description:
    "Thiết lập cấu hình giá dịch vụ và ngày cao điểm cho nền tảng CleanZ.",
};

export default function AdminPricingPage() {
  return <PricingClient />;
}
