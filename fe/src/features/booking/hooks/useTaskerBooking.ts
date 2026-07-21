import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskerBookingApi } from "../services/booking.service";
import { useAuth } from "@/features/auth/hooks/auth.hooks";
import type {
  CreateBookingForCustomerDto,
  TaskerCompletedBookingRange,
} from "../types/booking.types";

const TASKER_KEYS = {
  postedList: ["tasker-booking", "posted-list"],
  postedDetail: (id: string) => ["tasker-booking", "posted", id],
  assigned: (id: string) => ["tasker-booking", "assigned", id],
  active: ["tasker-booking", "active"],
  completed: (
    page: number,
    limit: number,
    range?: TaskerCompletedBookingRange,
  ) => ["tasker-booking", "completed", page, limit, range],
  customerVouchers: (phone: string, packageId?: string) => [
    "tasker-booking",
    "customer-vouchers",
    phone,
    packageId,
  ],
};

function getErrorMsg(err: unknown): string {
  const data = (
    err as { response?: { data?: { message?: unknown; errors?: unknown } } }
  )?.response?.data;
  const message = data?.message ?? data?.errors;

  if (typeof message === "string") return message;
  if (Array.isArray(message)) return message.join(", ");
  if (message && typeof message === "object") {
    return Object.values(message as Record<string, unknown>)
      .map((value) =>
        typeof value === "string" ? value : JSON.stringify(value),
      )
      .join(", ");
  }

  return "Có lỗi xảy ra";
}

function getCustomerLookupErrorMsg(err: unknown): string {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 404) {
    return "Không tìm thấy khách hàng với số điện thoại này";
  }

  return getErrorMsg(err);
}

export function isSilentTaskerBookingError(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  const message = getErrorMsg(err).toLocaleLowerCase("vi-VN");

  if (status === 404) {
    return (
      message.includes("booking không tồn tại") ||
      message.includes("không thuộc tasker") ||
      message.includes("không còn ở trạng thái posted") ||
      message.includes("không còn khả dụng") ||
      message.includes("đã có tasker nhận")
    );
  }

  if (status === 409) {
    return (
      message.includes("không còn khả dụng") ||
      message.includes("đã có tasker nhận")
    );
  }

  return false;
}

function handleTaskerBookingError(err: unknown) {
  if (isSilentTaskerBookingError(err)) {
    console.info(
      "[TaskerBooking] Bỏ qua lỗi booking stale/không thuộc tasker:",
      getErrorMsg(err),
    );
    return;
  }

  toast.error(getErrorMsg(err));
}

// ─── Tasker Hooks ─────────────────────────────────────────────────────────────

/** 04. Danh sách đơn đang chờ nhận */
export function usePostedBookingList() {
  const { data: user, isLoading: isAuthLoading } = useAuth();
  const isTaskerReady = !isAuthLoading && user?.role === "TASKER";

  return useQuery({
    queryKey: TASKER_KEYS.postedList,
    queryFn: () => taskerBookingApi.findPostedList(),
    enabled: isTaskerReady,
    refetchInterval: isTaskerReady ? 15_000 : false, // poll 15s để cập nhật đơn mới
  });
}

/** 05. Chi tiết đơn posted + khoảng cách */
export function usePostedBookingDetail(
  id: string,
  location?: { currentLatitude?: number; currentLongitude?: number },
  enabled = true,
) {
  const { data: user, isLoading: isAuthLoading } = useAuth();
  const isTaskerReady = !isAuthLoading && user?.role === "TASKER";

  return useQuery({
    queryKey: [...TASKER_KEYS.postedDetail(id), location],
    queryFn: () => taskerBookingApi.findPostedDetail(id, location),
    enabled:
      isTaskerReady &&
      enabled &&
      !!id &&
      Number.isFinite(location?.currentLatitude) &&
      Number.isFinite(location?.currentLongitude),
  });
}

/** 06. Nhận đơn */
export function useAcceptBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taskerBookingApi.accept(id),
    onSuccess: (data) => {
      toast.success(`Đã nhận đơn ${data.bookingCode}! 🎉`);
      void qc.invalidateQueries({ queryKey: TASKER_KEYS.postedList });
      void qc.invalidateQueries({ queryKey: TASKER_KEYS.active });
      void qc.invalidateQueries({ queryKey: TASKER_KEYS.postedDetail(data.id) });
      void qc.invalidateQueries({ queryKey: TASKER_KEYS.assigned(data.id) });
    },
    onError: (err: unknown, bookingId) => {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      if (status === 409) {
        toast.warning("Đơn đã có người nhận");
      } else if (status === 403) {
        toast.warning(getErrorMsg(err));
      } else {
        handleTaskerBookingError(err);
      }

      void qc.invalidateQueries({ queryKey: TASKER_KEYS.postedList });
      void qc.invalidateQueries({
        queryKey: TASKER_KEYS.postedDetail(bookingId),
      });
    },
  });
}

/** 07. Chi tiết đơn đã nhận */
export function useAssignedBookingDetail(
  id: string,
  location?: { currentLatitude?: number; currentLongitude?: number },
  enabled = true,
) {
  const { data: user, isLoading: isAuthLoading } = useAuth();
  const isTaskerReady = !isAuthLoading && user?.role === "TASKER";

  const hasLocation =
    Number.isFinite(location?.currentLatitude) &&
    Number.isFinite(location?.currentLongitude);
  const isReady = isTaskerReady && enabled && !!id;

  return useQuery({
    queryKey: [...TASKER_KEYS.assigned(id), location],
    queryFn: () => taskerBookingApi.findAssigned(id, location),
    // Cho phép query ngay cả khi chưa có location — BE sẽ trả distance=null thay vì 404.
    enabled: isReady,
    refetchInterval: isReady ? 10_000 : false,
    // Khi có location thì coi data cũ là stale để refetch ngay với tọa độ mới.
    staleTime: hasLocation ? 0 : 30_000,
  });
}

/** 07A. Lấy đơn hàng đang hoạt động hiện tại */
export function useTaskerActiveBooking() {
  const { data: user, isLoading: isAuthLoading } = useAuth();
  const isTaskerReady = !isAuthLoading && user?.role === "TASKER";

  return useQuery({
    queryKey: TASKER_KEYS.active,
    queryFn: () => taskerBookingApi.findActive(),
    enabled: isTaskerReady,
    refetchInterval: isTaskerReady ? 10_000 : false, // poll mỗi 10s
  });
}

export function useTaskerCompletedBookings(
  page = 1,
  limit = 10,
  enabled = true,
  range?: TaskerCompletedBookingRange,
) {
  const { data: user, isLoading: isAuthLoading } = useAuth();
  const isTaskerReady = !isAuthLoading && user?.role === "TASKER";

  return useQuery({
    queryKey: TASKER_KEYS.completed(page, limit, range),
    queryFn: () => taskerBookingApi.findCompleted(page, limit, range),
    enabled: isTaskerReady && enabled,
  });
}

/** 08. Bắt đầu di chuyển */
export function useMarkOnTheWay(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => taskerBookingApi.markOnTheWay(bookingId),
    onSuccess: () => {
      toast.success("Đã bật trạng thái đang tới");
      void qc.invalidateQueries({ queryKey: TASKER_KEYS.assigned(bookingId) });
      void qc.invalidateQueries({ queryKey: TASKER_KEYS.active });
    },
    onError: handleTaskerBookingError,
  });
}

/** 09. Check-in khi đến nơi */
export function useMarkCheckedIn(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => taskerBookingApi.markCheckedIn(bookingId),
    onSuccess: (response) => {
      const result = response.checkinResult;
      if (result?.alreadyCheckedIn) return;
      if (result?.warningPoints) {
        toast.warning(
          `Check-in muộn ${result.minutesLate} phút — bạn bị cộng ${result.warningPoints} điểm cảnh báo`,
          { duration: 7000 },
        );
      } else {
        toast.success("Check-in thành công! Bạn đến đúng giờ");
      }
      void qc.invalidateQueries({ queryKey: TASKER_KEYS.assigned(bookingId) });
      void qc.invalidateQueries({ queryKey: TASKER_KEYS.active });
    },
    onError: handleTaskerBookingError,
  });
}

/** 10. Bắt đầu làm việc */
export function useMarkStart(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => taskerBookingApi.markStart(bookingId),
    onSuccess: () => {
      toast.success("Bắt đầu làm việc! 💪");
      void qc.invalidateQueries({ queryKey: TASKER_KEYS.assigned(bookingId) });
      void qc.invalidateQueries({ queryKey: TASKER_KEYS.active });
    },
    onError: handleTaskerBookingError,
  });
}

/** 11. Hoàn thành */
export function useMarkComplete(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => taskerBookingApi.markComplete(bookingId),
    onSuccess: (data) => {
      if (data.workTiming?.surchargePending) {
        toast.success(
          `Đã checkout đơn ${data.bookingCode}. Chờ khách xác nhận phần phát sinh thêm giờ ⏳`,
        );
      } else {
        toast.success(
          `Hoàn thành đơn ${data.bookingCode}! Thu nhập đã vào ví ✅`,
        );
      }
      void qc.invalidateQueries({ queryKey: TASKER_KEYS.assigned(bookingId) });
      void qc.invalidateQueries({ queryKey: TASKER_KEYS.active });
      void qc.invalidateQueries({ queryKey: TASKER_KEYS.postedList });
    },
    onError: handleTaskerBookingError,
  });
}

/** 13. Tra cứu customer theo SĐT */
export function useCustomerLookup() {
  return useMutation({
    mutationFn: (phone: string) => taskerBookingApi.lookupCustomer(phone),
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      // 404 = khách chưa có tài khoản → modal tự chuyển sang tạo đơn offline,
      // không hiện toast lỗi.
      if (status === 404) return;
      toast.error(getCustomerLookupErrorMsg(err));
    },
  });
}

/** 13b. Voucher khả dụng của customer trong flow tasker tạo đơn hộ */
export function useTaskerCustomerVouchers(
  phone: string,
  packageId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: TASKER_KEYS.customerVouchers(phone, packageId),
    queryFn: () => taskerBookingApi.findCustomerVouchers(phone, packageId),
    enabled: enabled && !!phone.trim() && !!packageId,
    staleTime: 30_000,
  });
}

/** 14. Tạo đơn hộ customer */
export function useCreateBookingForCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateBookingForCustomerDto) =>
      taskerBookingApi.createForCustomer(dto),
    onSuccess: (data) => {
      // Guest/offline → vào thẳng CONFIRMED (không có confirmationDeadline).
      if (data.confirmationDeadline == null) {
        toast.success(
          `Đã tạo đơn offline ${data.bookingCode} cho khách vãng lai ✅`,
          { duration: 6000 },
        );
      } else {
        toast.success(
          `Đã tạo đơn ${data.bookingCode}! Chờ khách xác nhận trong 15 phút ⏳`,
          { duration: 7000 },
        );
      }
      void qc.invalidateQueries({ queryKey: TASKER_KEYS.active });
    },
    onError: (err: unknown) => toast.error(getErrorMsg(err)),
  });
}

/** 12. Tasker hủy đơn */
export function useCancelByTasker(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) =>
      taskerBookingApi.cancelByTasker(bookingId, reason),
    onSuccess: (res) => {
      toast.success(res.message ?? "Đã hủy đơn. Đơn đang được tìm tasker mới.");
      void qc.invalidateQueries({ queryKey: TASKER_KEYS.assigned(bookingId) });
      void qc.invalidateQueries({ queryKey: TASKER_KEYS.active });
      void qc.invalidateQueries({ queryKey: TASKER_KEYS.postedList });
    },
    onError: handleTaskerBookingError,
  });
}
