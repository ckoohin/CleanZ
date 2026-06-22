import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { customerBookingApi } from "../services/booking.service";
import type {
  CancelBookingDto,
  CreateBookingDto,
  QuoteBookingDto,
  UpdateBookingScheduleDto,
} from "../types/booking.types";

const QUERY_KEYS = {
  myActive: ["booking", "my-active"],
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

/** Tạo booking */
export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateBookingDto) => customerBookingApi.create(dto),
    onSuccess: () => {
      toast.success("Đặt lịch thành công! Đang tìm Tasker...");
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.myActive });
    },
    onError: (err: unknown) => {
      toast.error(getBookingErrorMessage(err, "Không thể tạo booking"));
    },
  });
}

/** Chi tiết booking */
export function useBookingDetail(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: () => customerBookingApi.findDetail(id),
    enabled: !!id,
  });
}

/** Active booking (cho History page + Home widget) */
export function useMyActiveBooking() {
  return useQuery({
    queryKey: QUERY_KEYS.myActive,
    queryFn: () => customerBookingApi.findMyActive(),
    refetchInterval: 30_000, // poll 30s để cập nhật status
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
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Không thể hủy booking";
      toast.error(message);
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
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Không thể cập nhật";
      toast.error(message);
    },
  });
}
