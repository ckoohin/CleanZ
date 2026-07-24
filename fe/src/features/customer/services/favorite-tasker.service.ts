import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import type {
  FavoriteTasker,
  FavoriteTaskerAvailability,
  FavoriteTaskerAvailabilityParams,
  FavoriteTaskerContact,
} from "@/features/booking/types/booking.types";

export const favoriteTaskerApi = {
  /** Danh sách thợ yêu thích, kèm cờ isPremiumEligible cho luồng đặt Cao cấp. */
  list: (): Promise<FavoriteTasker[]> =>
    http
      .get(API_ENDPOINTS.CUSTOMER.FAVORITE_TASKERS)
      .then((r) => r.data.data ?? r.data),

  listAvailability: (
    params: FavoriteTaskerAvailabilityParams,
  ): Promise<FavoriteTaskerAvailability[]> =>
    http
      .get(API_ENDPOINTS.CUSTOMER.FAVORITE_TASKERS_AVAILABILITY, { params })
      .then((r) => r.data.data ?? r.data),

  getContact: (taskerId: string): Promise<FavoriteTaskerContact> =>
    http
      .get(API_ENDPOINTS.CUSTOMER.FAVORITE_TASKER_CONTACT(taskerId))
      .then((r) => r.data.data ?? r.data),

  /** Chỉ thêm được thợ đã từng hoàn thành đơn cho chính khách (BE chặn). */
  add: (taskerId: string, note?: string): Promise<{ taskerId: string }> =>
    http
      .post(
        API_ENDPOINTS.CUSTOMER.FAVORITE_TASKER(taskerId),
        { note },
        { skipErrorToast: true } as Parameters<typeof http.post>[2],
      )
      .then((r) => r.data.data ?? r.data),

  remove: (taskerId: string): Promise<{ taskerId: string }> =>
    http
      .delete(API_ENDPOINTS.CUSTOMER.FAVORITE_TASKER(taskerId))
      .then((r) => r.data.data ?? r.data),
};
