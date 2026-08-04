import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { customerBookingApi } from "../services/booking.service";
import { useAuth } from "@/features/auth/hooks/auth.hooks";
import { customerWalletKeys } from "@/features/customer/wallet/hooks/useCustomerWallet";
import type {
  CancelBookingDto,
  CreateBookingDto,
  QuoteBookingDto,
  UpdateBookingScheduleDto,
} from "../types/booking.types";
import { getApiErrorMessage } from "@/lib/api/error-message";

const QUERY_KEYS = {
  schedulingPolicy: ["booking", "customer-scheduling-policy"] as const,
  myActive: ["booking", "my-active"],
  myList: ["booking", "my-list"],
  detail: (id: string) => ["booking", id],
};

function getBookingErrorMessage(error: unknown, fallback: string): string {
  return getApiErrorMessage(error, fallback);
}

// ─── Customer Hooks ───────────────────────────────────────────────────────────

export function useCustomerSchedulingPolicy() {
  return useQuery({
    queryKey: QUERY_KEYS.schedulingPolicy,
    queryFn: () => customerBookingApi.getSchedulingPolicy(),
    staleTime: 60_000,
  });
}

/** Xem báo giá (gọi thủ công khi user submit form) */
export function useBookingQuote() {
  return useMutation({
    mutationFn: (dto: QuoteBookingDto) => customerBookingApi.quote(dto),
    onError: (err: unknown) => {
      const msgError = err as {
        response?: { data?: { errors?: { message?: string } } };
      };
      toast.error(
        getBookingErrorMessage(
          err,
          msgError?.response?.data?.errors?.message ?? "Không thể xem báo giá",
        ),
      );
    },
  });
}

/** Xem báo giá realtime dạng Query */
export function useBookingQuoteQuery(
  dto: QuoteBookingDto,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: ["booking", "quote", dto],
    queryFn: () => customerBookingApi.quote(dto),
    enabled:
      enabled && !!dto.packageId && !!dto.scheduledDate && !!dto.scheduledTime,
    staleTime: 0,
    gcTime: 0,
  });
}

/** Tạo booking */
export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateBookingDto) => customerBookingApi.create(dto),
    onSuccess: (result) => {
      // ONLINE: QR screen tự xử lý — không toast "Đang tìm Tasker" vì chưa dispatch.
      if (result.payment?.method !== "ONLINE") {
        toast.success("Đặt lịch thành công! Đang tìm Tasker...");
      }
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.myActive });
      // Đơn trả bằng ví bị trừ tiền ngay lúc tạo → refresh số dư.
      void qc.invalidateQueries({ queryKey: customerWalletKeys.all });
    },
    onError: (err: unknown) => {
      toast.error(getBookingErrorMessage(err, "Không thể tạo booking"));
    },
  });
}

/** Chi tiết booking */
export function useBookingDetail(
  id: string,
  options?: { staleTime?: number; refetchOnMount?: boolean | "always" },
) {
  const { data: user, isLoading: isAuthLoading } = useAuth();
  const isCustomerReady = !isAuthLoading && user?.role === "CUSTOMER";

  return useQuery({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: () => customerBookingApi.findDetail(id),
    enabled: isCustomerReady && !!id,
    staleTime: options?.staleTime,
    refetchOnMount: options?.refetchOnMount,
    refetchInterval: (query) => {
      if (!isCustomerReady || !id) return false;
      const status = query.state.data?.status;
      if (status === "COMPLETED" || status === "CANCELLED") {
        return false;
      }
      return 5000;
    },
  });
}

/** Active booking (cho History page + Home widget) */
export function useMyActiveBooking() {
  const { data: user, isLoading: isAuthLoading } = useAuth();
  const isCustomerReady = !isAuthLoading && user?.role === "CUSTOMER";

  return useQuery({
    queryKey: QUERY_KEYS.myActive,
    queryFn: () => customerBookingApi.findMyActive(),
    enabled: isCustomerReady,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: (query) => {
      if (!isCustomerReady) return false;
      return query.state.data?.booking ? 5_000 : 30_000;
    },
  });
}

/** Danh sách lịch sử booking (History page + Profile stats) */
export function useMyBookingHistory() {
  const { data: user, isLoading: isAuthLoading } = useAuth();
  const isCustomerReady = !isAuthLoading && user?.role === "CUSTOMER";

  return useQuery({
    queryKey: QUERY_KEYS.myList,
    queryFn: () => customerBookingApi.findMyBookings(),
    enabled: isCustomerReady,
    staleTime: 2 * 60 * 1000, // cache 2 phút
  });
}

/** Hủy booking */
export function useCancelBooking(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CancelBookingDto) =>
      customerBookingApi.cancel(bookingId, dto),
    onSuccess: () => {
      toast.success("Đã hủy booking thành công");
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.detail(bookingId) });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.myActive });
      // Hủy đơn trả bằng ví sẽ được hoàn tiền → refresh số dư.
      void qc.invalidateQueries({ queryKey: customerWalletKeys.all });
    },
    onError: (err: unknown) => {
      toast.error(getBookingErrorMessage(err, "Không thể hủy đơn"));
    },
  });
}

/** Xác nhận đơn do tasker tạo hộ */
export function useConfirmTaskerBooking(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => customerBookingApi.confirmTaskerBooking(bookingId),
    onSuccess: () => {
      toast.success("Đã xác nhận đơn! Tasker sẽ đến theo lịch hẹn ✅");
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.detail(bookingId) });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.myActive });
    },
    onError: (err: unknown) => {
      toast.error(getBookingErrorMessage(err, "Không thể xác nhận đơn"));
    },
  });
}

/** Từ chối đơn do tasker tạo hộ */
export function useDeclineTaskerBooking(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => customerBookingApi.declineTaskerBooking(bookingId),
    onSuccess: () => {
      toast.success("Đã từ chối đơn");
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.detail(bookingId) });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.myActive });
    },
    onError: (err: unknown) => {
      toast.error(getBookingErrorMessage(err, "Không thể từ chối đơn"));
    },
  });
}

/** Xác nhận hoàn thành + thanh toán phần phát sinh (thêm giờ) */
export function useConfirmCompletion(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (surchargePaymentMethod?: "WALLET" | "CASH") =>
      customerBookingApi.confirmCompletion(bookingId, surchargePaymentMethod),
    onSuccess: () => {
      toast.success("Đã xác nhận hoàn thành và thanh toán phần phát sinh ✅");
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.detail(bookingId) });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.myActive });
    },
    onError: (err: unknown) => {
      toast.error(
        getBookingErrorMessage(err, "Không thể xác nhận phần phát sinh"),
      );
    },
  });
}

/** Khách từ chối trả phần phát sinh → đơn hoàn thành theo giá gốc */
export function useRejectSurcharge(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) =>
      customerBookingApi.rejectSurcharge(bookingId, reason),
    onSuccess: () => {
      toast.success("Đã ghi nhận. Đơn hoàn thành theo giá gốc.");
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.detail(bookingId) });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.myActive });
    },
    onError: (err: unknown) => {
      toast.error(
        getBookingErrorMessage(err, "Không thể từ chối phần phát sinh"),
      );
    },
  });
}

/** Khách duyệt/từ chối yêu cầu thêm giờ của tasker (TRƯỚC khi làm thêm) */
export function useRespondOvertime(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: "APPROVE" | "REJECT") =>
      customerBookingApi.respondOvertime(bookingId, action),
    onSuccess: (_data, action) => {
      toast.success(
        action === "APPROVE"
          ? "Đã duyệt thêm giờ cho tasker ✅"
          : "Đã từ chối yêu cầu thêm giờ",
      );
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.detail(bookingId) });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.myActive });
      // Đơn ví bị giữ tiền ngay khi duyệt → refresh số dư.
      void qc.invalidateQueries({ queryKey: customerWalletKeys.all });
    },
    onError: (err: unknown) => {
      toast.error(
        getBookingErrorMessage(err, "Không thể phản hồi yêu cầu thêm giờ"),
      );
    },
  });
}

/** Cập nhật lịch/địa chỉ */
export function useUpdateBookingSchedule(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateBookingScheduleDto) =>
      customerBookingApi.updateSchedule(bookingId, dto),
    onSuccess: () => {
      toast.success("Cập nhật lịch thành công");
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.detail(bookingId) });
    },
    onError: (err: unknown) => {
      toast.error(getBookingErrorMessage(err, "Không thể cập nhật đơn"));
    },
  });
}
