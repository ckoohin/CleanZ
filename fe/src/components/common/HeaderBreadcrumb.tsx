"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const TITLE_MAP: Record<string, string> = {
  "admin": "Quản trị",
  "dashboard": "Bảng điều khiển",
  "services": "Dịch vụ",
  "categories": "Danh mục",
  "pricing": "Bảng giá chuyển động",
  "bookings": "Đơn hàng",
  "active": "Đang thực hiện",
  "history": "Lịch sử",
  "refunds": "Hoàn tiền",
  "tasker": "Nhân viên",
  "verification": "Xác minh",
  "schedule": "Lịch làm việc",
  "payroll": "Bảng lương",
  "customers": "Khách hàng",
  "loyalty": "Loyalty",
  "plans": "Gói Subscription",
  "finance": "Tài chính",
  "transactions": "Giao dịch",
  "invoices": "Hóa đơn",
  "reviews": "Đánh giá",
  "analytics": "Phân tích",
  "content": "Nội dung",
  "banners": "Banner",
  "faqs": "FAQs",
  "notifications": "Thông báo",
  "settings": "Cài đặt",
  "roles": "Phân quyền",
};

export default function HeaderBreadcrumb() {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);

  const getLabel = (path: string, segment: string) => {
    if (TITLE_MAP[segment.toLowerCase()]) {
      return TITLE_MAP[segment.toLowerCase()];
    }

    // nếu là id
    if (!isNaN(Number(segment))) {
      return "Chi tiết";
    }

    return segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  return (
    <nav className="flex items-center text-sm text-muted-foreground mb-5">
      <Link
        href="/admin/dashboard"
        className="flex items-center gap-1 hover:text-foreground transition"
      >
        <Home className="size-4" />
        <span className="hidden sm:inline">Trang chủ</span>
      </Link>

      {segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");
        const label = getLabel(href, segment);
        const isLast = index === segments.length - 1;

        return (
          <div key={href} className="flex items-center">
            <ChevronRight className="mx-2 size-4 opacity-50" />

            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link
                href={href}
                className="hover:text-foreground transition"
              >
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
