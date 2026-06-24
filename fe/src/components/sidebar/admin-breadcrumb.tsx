"use client"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { usePathname } from "next/navigation"

const ROUTE_LABELS: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/services": "Quản lý Dịch vụ",
  "/admin/service-packages": "Gói dịch vụ",
  "/admin/pricing": "Bảng giá",
  "/admin/bookings": "Quản lý Đơn hàng",
  "/admin/bookings/active": "Đang thực hiện",
  "/admin/bookings/history": "Lịch sử đơn hàng",
  "/admin/refunds": "Khiếu nại & Hoàn tiền",
  "/admin/tasker": "Quản lý Nhân sự",
  "/admin/tasker/verification": "Xác minh hồ sơ",
  "/admin/tasker/schedule": "Lịch làm việc",
  "/admin/tasker/payroll": "Bảng lương",
  "/admin/customers": "Khách hàng",
  "/admin/customers/loyalty": "Phân hạng Loyalty",
  "/admin/customers/plans": "Gói Subscription",
  "/admin/finance": "Tài chính & Hóa đơn",
  "/admin/finance/transactions": "Giao dịch",
  "/admin/finance/invoices": "Hóa đơn",
  "/admin/reviews": "Đánh giá & Phản hồi",
  "/admin/analytics": "Báo cáo & Phân tích",
  "/admin/content": "Cấu hình nội dung",
  "/admin/content/banners": "Banner quảng cáo",
  "/admin/content/faqs": "FAQs & Trang tĩnh",
  "/admin/content/notifications": "Thông báo",
  "/admin/settings": "Cài đặt hệ thống",
  "/admin/roles": "Phân quyền & Role",
}

function getParentPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean)
  if (parts.length <= 2) return null
  return "/" + parts.slice(0, -1).join("/")
}

export function AdminBreadcrumb() {
  const pathname = usePathname()
  const currentLabel = ROUTE_LABELS[pathname] ?? "Admin"
  const parentPath = getParentPath(pathname)
  const parentLabel = parentPath ? (ROUTE_LABELS[parentPath] ?? null) : null

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            href="/admin"
            className="font-medium hover:text-primary transition-colors"
          >
            CleanZ
          </BreadcrumbLink>
        </BreadcrumbItem>

        {parentPath && parentLabel && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                href={parentPath}
                className="hover:text-primary transition-colors"
              >
                {parentLabel}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}

        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className="font-bold text-primary">
            {currentLabel}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
