import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMyActiveBooking, useMyBookingHistory } from "@/features/booking/hooks/useCustomerBooking";
import { useCustomerAddresses } from "@/features/customer/profile/hooks/useCustomerAddresses";
import { useCustomerVouchers, type AvailableVoucher } from "@/features/customer/vouchers/useCustomerVouchers";
import { usePublishedBlogs } from "@/features/blog/hooks/useBlog";
import { catalogApi } from "@/features/customer/catalog/services/catalog.service";
import type { CustomerBookingDetail } from "@/features/booking/types/booking.types";
import type { PublicService } from "@/features/services/types/public-service.type";
import type { BlogPost } from "@/features/blog/types/blog.types";

export interface CustomerHomeData {
  // Widget booking đang hoạt động
  activeBooking: CustomerBookingDetail | null;
  // 3 booking gần nhất đã kết thúc (cho section "Gần đây")
  recentBookings: CustomerBookingDetail[];
  // 2 địa chỉ đầu tiên (cho section "Địa chỉ đã lưu")
  savedAddresses: {
    id: string;
    label?: string | null;
    fullAddress: string;
    isDefault: boolean;
  }[];
  // Dịch vụ nổi bật (isPopular) hoặc đang khuyến mãi (hasPromo) — dữ liệu thật từ API
  featuredPackages: PublicService[];
  // Voucher khả dụng cho khách hàng hiện tại
  vouchers: AvailableVoucher[];
  // 3 bài blog xuất bản mới nhất
  featuredBlogs: BlogPost[];
  // Loading states
  isActiveLoading: boolean;
  isHistoryLoading: boolean;
  isAddressLoading: boolean;
  isFeaturedPackagesLoading: boolean;
  isVouchersLoading: boolean;
  isBlogsLoading: boolean;
  isLoading: boolean;
  // Error states — mỗi section mới tự quyết định ẩn khi lỗi, độc lập với nhau
  isFeaturedPackagesError: boolean;
  isVouchersError: boolean;
  isBlogsError: boolean;
}

export function useCustomerHome(): CustomerHomeData {
  const { data: activeData, isLoading: isActiveLoading } = useMyActiveBooking();
  const { data: historyData, isLoading: isHistoryLoading } = useMyBookingHistory();
  const { data: addresses = [], isLoading: isAddressLoading } = useCustomerAddresses();

  const {
    data: servicesResponse,
    isLoading: isFeaturedPackagesLoading,
    isError: isFeaturedPackagesError,
  } = useQuery({
    queryKey: ["customer-home-services"],
    queryFn: () => catalogApi.findAll(),
    staleTime: 60_000,
  });

  const {
    data: vouchers = [],
    isLoading: isVouchersLoading,
    isError: isVouchersError,
  } = useCustomerVouchers();

  const {
    data: blogsResponse,
    isLoading: isBlogsLoading,
    isError: isBlogsError,
  } = usePublishedBlogs({ limit: 3 });

  const activeBooking = activeData?.booking ?? null;

  const recentBookings = useMemo(() => {
    const items = historyData?.items ?? [];
    return items
      .filter((b) => b.status === "COMPLETED" || b.status === "CANCELLED")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [historyData]);

  const savedAddresses = useMemo(() => {
    // Đưa địa chỉ mặc định lên đầu
    return [...addresses]
      .sort((a, b) => (a.isDefault ? -1 : b.isDefault ? 1 : 0))
      .slice(0, 2)
      .map(({ id, label, fullAddress, isDefault }) => ({ id, label, fullAddress, isDefault }));
  }, [addresses]);

  const featuredPackages = useMemo(() => {
    const packages = servicesResponse?.data ?? [];
    return packages.filter((pkg) => pkg.isPopular || pkg.hasPromo);
  }, [servicesResponse]);

  const featuredBlogs = blogsResponse?.data ?? [];

  return {
    activeBooking,
    recentBookings,
    savedAddresses,
    featuredPackages,
    vouchers,
    featuredBlogs,
    isActiveLoading,
    isHistoryLoading,
    isAddressLoading,
    isFeaturedPackagesLoading,
    isVouchersLoading,
    isBlogsLoading,
    isLoading: isActiveLoading || isHistoryLoading || isAddressLoading,
    isFeaturedPackagesError,
    isVouchersError,
    isBlogsError,
  };
}
