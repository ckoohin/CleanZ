import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { customerBookingApi } from "../services/booking.service";
import { useAuth } from "@/features/auth/hooks/auth.hooks";
import { customerWalletKeys } from "@/features/customer/wallet/hooks/useCustomerWallet";
import type {
  CancelBookingDto,
  CreateBookingDto,
  QuoteBookingDto,
  UpdateBookingScheduleDto,
} from "../types/booking.types";

const QUERY_KEYS = {
  myActive: ["booking", "my-active"],
  myList: ["booking", "my-list"],
  detail: (id: string) => ["booking", id],
};

function getBookingErrorMessage(error: unknown, fallback: string): string {
  const responseMessage = (
    error as {
      response?: {
        data?: {
          message?: string | { message?: string };
        };
      };
    }
  )?.response?.data?.message;

  if (typeof responseMessage === "string") return responseMessage;
  return responseMessage?.message ?? fallback;
}

// ─── Customer Hooks ───────────────────────────────────────────────────────────

/** Xem báo giá (gọi thủ công khi user submit form) */
export function useBookingQuote() {
  return useMutation({
    mutationFn: (dto: QuoteBookingDto) => customerBookingApi.quote(dto),
    onError: (err: unknown) => {
      const msgError = err as { response?: { data?: { errors?: { message?: string } } } };
      toast.error(getBookingErrorMessage(err, msgError?.response?.data?.errors?.message ?? "Không thể xem báo giá"));
    },
  });
}

/** Xem báo giá realtime dạng Query */
export function useBookingQuoteQuery(dto: QuoteBookingDto, enabled: boolean = true) {
  return useQuery({
    queryKey: ["booking", "quote", dto],
    queryFn: () => customerBookingApi.quote(dto),
    enabled: enabled && !!dto.packageId && !!dto.scheduledDate && !!dto.scheduledTime,
    staleTime: 0,
    gcTime: 0,
  });
}

/** Tạo booking */
export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateBookingDto) => customerBookingApi.create(dto),
    onSuccess: () => {
      toast.success("Đặt lịch thành công! Đang tìm Tasker...");
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
      if (status === 'COMPLETED' || status === 'CANCELLED') {
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
    mutationFn: (dto: CancelBookingDto) => customerBookingApi.cancel(bookingId, dto),
    onSuccess: () => {
      toast.success("Đã hủy booking thành công");
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.detail(bookingId) });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.myActive });
      // Hủy đơn trả bằng ví sẽ được hoàn tiền → refresh số dư.
      void qc.invalidateQueries({ queryKey: customerWalletKeys.all });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Không thể hủy booking";
      toast.error(message);
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
      const raw = (err as { response?: { data?: { message?: unknown } } })
        ?.response?.data?.message;
      // Lỗi validation (422) trả message dạng object {field: "mô tả lỗi"} —
      // phải nối các mô tả lại, không thì toast hiển thị "[object Object]".
      const message =
        typeof raw === "string"
          ? raw
          : raw && typeof raw === "object"
            ? Object.values(raw as Record<string, unknown>)
                .filter((v): v is string => typeof v === "string")
                .join("; ")
            : "";
      toast.error(message || "Không thể cập nhật");
    },
  });
}
