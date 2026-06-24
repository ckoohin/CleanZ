import { useMemo } from "react";
import { useMyActiveBooking, useMyBookingHistory } from "@/features/booking/hooks/useCustomerBooking";
import { useCustomerAddresses } from "@/features/customer/profile/hooks/useCustomerAddresses";
import type { CustomerBookingDetail } from "@/features/booking/types/booking.types";

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
  // Loading states
  isActiveLoading: boolean;
  isHistoryLoading: boolean;
  isAddressLoading: boolean;
  isLoading: boolean;
}

export function useCustomerHome(): CustomerHomeData {
  const { data: activeData, isLoading: isActiveLoading } = useMyActiveBooking();
  const { data: historyData, isLoading: isHistoryLoading } = useMyBookingHistory();
  const { data: addresses = [], isLoading: isAddressLoading } = useCustomerAddresses();

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

  return {
    activeBooking,
    recentBookings,
    savedAddresses,
    isActiveLoading,
    isHistoryLoading,
    isAddressLoading,
    isLoading: isActiveLoading || isHistoryLoading || isAddressLoading,
  };
}
