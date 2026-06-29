import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import type {
  BookingQuoteResponse,
  CancelBookingDto,
  CreateBookingDto,
  CustomerActiveBookingResponse,
  CustomerBookingDetail,
  CustomerBookingListResponse,
  QuoteBookingDto,
  TaskerAcceptResponse,
  TaskerAssignedBookingDetail,
  TaskerPostedBookingDetail,
  TaskerPostedBookingListResponse,
  UpdateBookingScheduleDto,
} from "../types/booking.types";

// ─── Customer Booking APIs ─────────────────────────────────────────────────────
export const customerBookingApi = {
  /** 01. Xem báo giá trước khi tạo */
  quote: (dto: QuoteBookingDto): Promise<BookingQuoteResponse> =>
    http
      .post(API_ENDPOINTS.BOOKING.QUOTE, dto, {
        skipErrorToast: true,
      } as Parameters<typeof http.post>[2])
      .then((r) => r.data.data ?? r.data),

  /** 02. Tạo booking */
  create: (dto: CreateBookingDto): Promise<CustomerBookingDetail> =>
    http
      .post(API_ENDPOINTS.BOOKING.CREATE, dto, {
        skipErrorToast: true,
      } as Parameters<typeof http.post>[2])
      .then((r) => r.data.data ?? r.data),

  /** 03. Xem chi tiết booking */
  findDetail: (id: string): Promise<CustomerBookingDetail> =>
    http.get(API_ENDPOINTS.BOOKING.DETAIL(id)).then((r) => r.data.data ?? r.data),

  /** 03A. Đổi lịch/địa chỉ khi POSTED */
  updateSchedule: (id: string, dto: UpdateBookingScheduleDto): Promise<CustomerBookingDetail> =>
    http.patch(API_ENDPOINTS.BOOKING.UPDATE_SCHEDULE(id), dto).then((r) => r.data.data ?? r.data),

  /** 03B. Thanh toán ảo cho VNPAY */
  mockPay: (id: string): Promise<{ success: boolean; message: string }> =>
    http.post(API_ENDPOINTS.BOOKING.MOCK_PAY(id)).then((r) => r.data),

  /** 03C. Hủy booking */
  cancel: (id: string, dto: CancelBookingDto): Promise<{ message: string }> =>
    http.patch(API_ENDPOINTS.BOOKING.CANCEL(id), dto).then((r) => r.data),

  /** 03D. Lấy booking đang hoạt động */
  findMyActive: (): Promise<CustomerActiveBookingResponse> =>
    http.get(API_ENDPOINTS.BOOKING.MY_ACTIVE).then((r) => r.data.data ?? r.data),

  /** 03E. Danh sách toàn bộ booking của customer */
  findMyBookings: (): Promise<CustomerBookingListResponse> =>
    http.get(API_ENDPOINTS.BOOKING.MY_LIST).then((r) => r.data.data ?? r.data),
};

// ─── Tasker Booking APIs ───────────────────────────────────────────────────────
export const taskerBookingApi = {
  /** 04. Danh sách đơn đang chờ nhận */
  findPostedList: (): Promise<TaskerPostedBookingListResponse> =>
    http.get(API_ENDPOINTS.BOOKING.TASKER_POSTED_LIST).then((r) => r.data.data ?? r.data),

  /** 05. Chi tiết đơn posted + khoảng cách */
  findPostedDetail: (
    id: string,
    location?: { currentLatitude?: number; currentLongitude?: number }
  ): Promise<TaskerPostedBookingDetail> =>
    http
      .get(API_ENDPOINTS.BOOKING.TASKER_POSTED_DETAIL(id), { params: location })
      .then((r) => r.data.data ?? r.data),

  /** 06. Nhận đơn */
  accept: (id: string): Promise<TaskerAcceptResponse> =>
    http.post(API_ENDPOINTS.BOOKING.TASKER_ACCEPT(id)).then((r) => r.data.data ?? r.data),

  /** 07A. Lấy đơn hàng đang hoạt động hiện tại */
  findActive: (): Promise<TaskerAssignedBookingDetail | null> =>
    http.get(API_ENDPOINTS.BOOKING.TASKER_ACTIVE).then((r) => r.data.data ?? r.data),

  /** 07. Chi tiết đơn đã nhận */
  findAssigned: (
    id: string,
    location?: { currentLatitude?: number; currentLongitude?: number }
  ): Promise<TaskerAssignedBookingDetail> =>
    http
      .get(API_ENDPOINTS.BOOKING.TASKER_ASSIGNED(id), { params: location })
      .then((r) => r.data.data ?? r.data),

  /** 08. Bắt đầu di chuyển */
  markOnTheWay: (id: string): Promise<TaskerAssignedBookingDetail> =>
    http.patch(API_ENDPOINTS.BOOKING.TASKER_ON_WAY(id)).then((r) => r.data.data ?? r.data),

  /** 09. Check-in khi đến nơi */
  markCheckedIn: (id: string): Promise<TaskerAssignedBookingDetail> =>
    http.patch(API_ENDPOINTS.BOOKING.TASKER_CHECKIN(id)).then((r) => r.data.data ?? r.data),

  /** 10. Bắt đầu làm việc */
  markStart: (id: string): Promise<TaskerAssignedBookingDetail> =>
    http.patch(API_ENDPOINTS.BOOKING.TASKER_START(id)).then((r) => r.data.data ?? r.data),

  /** 11. Hoàn thành */
  markComplete: (id: string): Promise<TaskerAssignedBookingDetail> =>
    http.patch(API_ENDPOINTS.BOOKING.TASKER_COMPLETE(id)).then((r) => r.data.data ?? r.data),

  /** 12. Tasker hủy đơn (chỉ khi CONFIRMED) */
  cancelByTasker: (
    id: string,
    reason?: string,
  ): Promise<{
    message: string;
    penaltyAmount: number;
    weeklyCount: number;
    suspended: boolean;
    suspendedUntil?: string;
  }> =>
    http.patch(API_ENDPOINTS.BOOKING.TASKER_CANCEL(id), { reason }).then((r) => r.data.data ?? r.data),
};
