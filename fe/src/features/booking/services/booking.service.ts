import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import type {
  BookingQuoteResponse,
  CancelBookingDto,
  CreateBookingDto,
  CreateBookingForCustomerDto,
  CustomerActiveBookingResponse,
  CustomerBookingDetail,
  CustomerBookingListResponse,
  CustomerLookupResult,
  QuoteBookingDto,
  TaskerAcceptResponse,
  TaskerAssignedBookingDetail,
  TaskerCheckinPayload,
  TaskerCompletedBookingListResponse,
  TaskerCompletedBookingRange,
  TaskerCreatedBookingResponse,
  TaskerPostedBookingDetail,
  TaskerPostedBookingListResponse,
  UpdateBookingScheduleDto,
} from "../types/booking.types";
import type { AvailableVoucher } from "@/features/customer/vouchers/useCustomerVouchers";
import type { BookingOvertimeRequestStatus } from "../types/booking.types";

/** Kết quả trả về của các API xin/duyệt thêm giờ. */
export interface OvertimeRequestResult {
  bookingId: string;
  bookingCode: string;
  status: BookingOvertimeRequestStatus;
  minutes: number;
  fee: number;
  respondBy: string | null;
  approvedOvertimeMinutes: number;
}

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
    http
      .get(API_ENDPOINTS.BOOKING.DETAIL(id))
      .then((r) => r.data.data ?? r.data),

  /** 03A. Đổi lịch/địa chỉ khi POSTED */
  updateSchedule: (
    id: string,
    dto: UpdateBookingScheduleDto,
  ): Promise<CustomerBookingDetail> =>
    http
      .patch(API_ENDPOINTS.BOOKING.UPDATE_SCHEDULE(id), dto)
      .then((r) => r.data.data ?? r.data),

  /** 03C. Hủy booking */
  cancel: (id: string, dto: CancelBookingDto): Promise<{ message: string }> =>
    http.patch(API_ENDPOINTS.BOOKING.CANCEL(id), dto).then((r) => r.data),

  /** 03D. Lấy booking đang hoạt động */
  findMyActive: (): Promise<CustomerActiveBookingResponse> =>
    http
      .get(API_ENDPOINTS.BOOKING.MY_ACTIVE)
      .then((r) => r.data.data ?? r.data),

  /** 03E. Danh sách toàn bộ booking của customer */
  findMyBookings: (): Promise<CustomerBookingListResponse> =>
    http.get(API_ENDPOINTS.BOOKING.MY_LIST).then((r) => r.data.data ?? r.data),

  /** 03F. Xác nhận đơn do tasker tạo hộ */
  confirmTaskerBooking: (
    id: string,
  ): Promise<{ id: string; bookingCode: string; status: string }> =>
    http
      .patch(API_ENDPOINTS.BOOKING.CONFIRM_TASKER_BOOKING(id), undefined, {
        skipErrorToast: true,
      } as Parameters<typeof http.patch>[2])
      .then((r) => r.data.data ?? r.data),

  /** 03G. Từ chối đơn do tasker tạo hộ */
  declineTaskerBooking: (
    id: string,
  ): Promise<{ id: string; bookingCode: string; status: string }> =>
    http
      .patch(API_ENDPOINTS.BOOKING.DECLINE_TASKER_BOOKING(id), undefined, {
        skipErrorToast: true,
      } as Parameters<typeof http.patch>[2])
      .then((r) => r.data.data ?? r.data),

  /**
   * 03H. Xác nhận hoàn thành + thanh toán phần phát sinh (thêm giờ).
   * Đơn tiền mặt: bỏ trống surchargePaymentMethod (thanh toán tổng bằng tiền mặt).
   * Đơn trả trước bằng ví: chọn "WALLET" (trừ thêm vào ví) hoặc "CASH" (trả tiền mặt).
   */
  confirmCompletion: (
    id: string,
    surchargePaymentMethod?: "WALLET" | "CASH",
  ): Promise<{
    success: boolean;
    message: string;
    bookingId: string;
    status: string;
    totalPrice: number;
    surcharge: number;
  }> =>
    http
      .patch(
        API_ENDPOINTS.BOOKING.CONFIRM_COMPLETION(id),
        { surchargePaymentMethod },
        { skipErrorToast: true } as Parameters<typeof http.patch>[2],
      )
      .then((r) => r.data.data ?? r.data),

  /** 03I. Khách từ chối trả phần phát sinh → đơn hoàn thành theo giá gốc. */
  rejectSurcharge: (
    id: string,
    reason?: string,
  ): Promise<{
    success: boolean;
    message: string;
    bookingId: string;
    status: string;
    totalPrice: number;
  }> =>
    http
      .patch(API_ENDPOINTS.BOOKING.REJECT_SURCHARGE(id), { reason }, {
        skipErrorToast: true,
      } as Parameters<typeof http.patch>[2])
      .then((r) => r.data.data ?? r.data),

  /** 03J. Khách duyệt/từ chối yêu cầu thêm giờ TRƯỚC khi tasker làm thêm. */
  respondOvertime: (
    id: string,
    action: "APPROVE" | "REJECT",
  ): Promise<OvertimeRequestResult> =>
    http
      .patch(API_ENDPOINTS.BOOKING.RESPOND_OVERTIME(id), { action }, {
        skipErrorToast: true,
      } as Parameters<typeof http.patch>[2])
      .then((r) => r.data.data ?? r.data),
};

// ─── Tasker Booking APIs ───────────────────────────────────────────────────────
export const taskerBookingApi = {
  /** 04. Danh sách đơn đang chờ nhận */
  findPostedList: (): Promise<TaskerPostedBookingListResponse> =>
    http
      .get(API_ENDPOINTS.BOOKING.TASKER_POSTED_LIST)
      .then((r) => r.data.data ?? r.data),

  /** 05. Chi tiết đơn posted + khoảng cách */
  findPostedDetail: (
    id: string,
    location?: { currentLatitude?: number; currentLongitude?: number },
  ): Promise<TaskerPostedBookingDetail> =>
    http
      .get(API_ENDPOINTS.BOOKING.TASKER_POSTED_DETAIL(id), {
        params: location,
        skipErrorToast: true,
      } as Parameters<typeof http.get>[1])
      .then((r) => r.data.data ?? r.data),

  /** 06. Nhận đơn */
  accept: (id: string): Promise<TaskerAcceptResponse> =>
    http
      .post(API_ENDPOINTS.BOOKING.TASKER_ACCEPT(id), undefined, {
        skipErrorToast: true,
      } as Parameters<typeof http.post>[2])
      .then((r) => r.data.data ?? r.data),

  /** 07A. Lấy đơn hàng đang hoạt động hiện tại */
  findActive: (): Promise<TaskerAssignedBookingDetail | null> =>
    http
      .get(API_ENDPOINTS.BOOKING.TASKER_ACTIVE)
      .then((r) => r.data.data ?? r.data),

  findCompleted: (
    page = 1,
    limit = 10,
    range?: TaskerCompletedBookingRange,
  ): Promise<TaskerCompletedBookingListResponse> =>
    http
      .get(API_ENDPOINTS.BOOKING.TASKER_COMPLETED, {
        params: { page, limit, ...range },
      })
      .then((r) => r.data.data ?? r.data),

  /** 07. Chi tiết đơn đã nhận */
  findAssigned: (
    id: string,
    location?: { currentLatitude?: number; currentLongitude?: number },
  ): Promise<TaskerAssignedBookingDetail> =>
    http
      .get(API_ENDPOINTS.BOOKING.TASKER_ASSIGNED(id), {
        params: location,
        skipErrorToast: true,
      } as Parameters<typeof http.get>[1])
      .then((r) => r.data.data ?? r.data),

  /** 08. Bắt đầu di chuyển */
  markOnTheWay: (id: string): Promise<TaskerAssignedBookingDetail> =>
    http
      .patch(API_ENDPOINTS.BOOKING.TASKER_ON_WAY(id))
      .then((r) => r.data.data ?? r.data),

  /** 09. Check-in khi đến nơi (kèm GPS; xa >50m phải kèm ảnh minh chứng) */
  markCheckedIn: (
    id: string,
    payload: TaskerCheckinPayload = {},
  ): Promise<TaskerAssignedBookingDetail> =>
    http
      .patch(API_ENDPOINTS.BOOKING.TASKER_CHECKIN(id), payload, {
        skipErrorToast: true,
      } as Parameters<typeof http.patch>[2])
      .then((r) => r.data.data ?? r.data),

  /** 10. Bắt đầu làm việc */
  markStart: (id: string): Promise<TaskerAssignedBookingDetail> =>
    http
      .patch(API_ENDPOINTS.BOOKING.TASKER_START(id))
      .then((r) => r.data.data ?? r.data),

  /** 11. Hoàn thành */
  markComplete: (id: string): Promise<TaskerAssignedBookingDetail> =>
    http
      .patch(API_ENDPOINTS.BOOKING.TASKER_COMPLETE(id))
      .then((r) => r.data.data ?? r.data),

  /** 11A. Báo khách công việc có thể phát sinh thêm giờ. */
  requestOvertime: (id: string): Promise<OvertimeRequestResult> =>
    http
      .post(API_ENDPOINTS.BOOKING.TASKER_REQUEST_OVERTIME(id), undefined, {
        skipErrorToast: true,
      } as Parameters<typeof http.post>[2])
      .then((r) => r.data.data ?? r.data),

  /** 11B. Xác nhận đã nhận đủ tiền mặt phần phát sinh → đơn mới hoàn thành */
  confirmSurchargeReceived: (
    id: string,
  ): Promise<{
    success: boolean;
    message: string;
    bookingId: string;
    status: string;
    totalPrice: number;
    surcharge: number;
  }> =>
    http
      .patch(
        API_ENDPOINTS.BOOKING.TASKER_CONFIRM_SURCHARGE_RECEIVED(id),
        undefined,
        { skipErrorToast: true } as Parameters<typeof http.patch>[2],
      )
      .then((r) => r.data.data ?? r.data),

  /** 13. Tra cứu customer theo SĐT (để tạo đơn hộ) */
  lookupCustomer: (phone: string): Promise<CustomerLookupResult> =>
    http
      .get(API_ENDPOINTS.CUSTOMER.LOOKUP, {
        params: { phone },
        skipErrorToast: true,
      } as Parameters<typeof http.get>[1])
      .then((r) => r.data.data ?? r.data),

  /** 13b. Lấy voucher khả dụng của customer khi tasker tạo đơn hộ */
  findCustomerVouchers: (
    phone: string,
    packageId?: string,
  ): Promise<AvailableVoucher[]> =>
    http
      .get(API_ENDPOINTS.BOOKING.TASKER_CUSTOMER_VOUCHERS_AVAILABLE, {
        params: packageId ? { phone, packageId } : { phone },
        skipErrorToast: true,
      } as Parameters<typeof http.get>[1])
      .then((r) => r.data.data ?? r.data),

  /** 14. Tạo đơn hộ customer → chờ khách xác nhận trong 15 phút */
  createForCustomer: (
    dto: CreateBookingForCustomerDto,
  ): Promise<TaskerCreatedBookingResponse> =>
    http
      .post(API_ENDPOINTS.BOOKING.TASKER_CREATE_FOR_CUSTOMER, dto, {
        skipErrorToast: true,
      } as Parameters<typeof http.post>[2])
      .then((r) => r.data.data ?? r.data),

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
    http
      .patch(API_ENDPOINTS.BOOKING.TASKER_CANCEL(id), { reason })
      .then((r) => r.data.data ?? r.data),
};
