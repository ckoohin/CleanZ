import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskerBookingApi } from "../services/booking.service";
import { useAuth } from "@/features/auth/hooks/auth.hooks";

const TASKER_KEYS = {
  postedList: ["tasker-booking", "posted-list"],
  postedDetail: (id: string) => ["tasker-booking", "posted", id],
  assigned: (id: string) => ["tasker-booking", "assigned", id],
  active: ["tasker-booking", "active"],
};

function getErrorMsg(err: unknown): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    "Có lỗi xảy ra"
  );
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
    },
    onError: (err: unknown) => toast.error(getErrorMsg(err)),
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

  return useQuery({
    queryKey: [...TASKER_KEYS.assigned(id), location],
    queryFn: () => taskerBookingApi.findAssigned(id, location),
    enabled: isTaskerReady && enabled && !!id,
    refetchInterval: isTaskerReady && enabled && !!id ? 10_000 : false,
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
    onError: (err: unknown) => toast.error(getErrorMsg(err)),
  });
}

/** 09. Check-in khi đến nơi */
export function useMarkCheckedIn(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => taskerBookingApi.markCheckedIn(bookingId),
    onSuccess: () => {
      toast.success("Check-in thành công! Bạn đã đến nơi");
      void qc.invalidateQueries({ queryKey: TASKER_KEYS.assigned(bookingId) });
      void qc.invalidateQueries({ queryKey: TASKER_KEYS.active });
    },
    onError: (err: unknown) => toast.error(getErrorMsg(err)),
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
    onError: (err: unknown) => toast.error(getErrorMsg(err)),
  });
}

/** 11. Hoàn thành */
export function useMarkComplete(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => taskerBookingApi.markComplete(bookingId),
    onSuccess: (data) => {
      toast.success(`Hoàn thành đơn ${data.bookingCode}! Thu nhập đã vào ví ✅`);
      void qc.invalidateQueries({ queryKey: TASKER_KEYS.assigned(bookingId) });
      void qc.invalidateQueries({ queryKey: TASKER_KEYS.active });
      void qc.invalidateQueries({ queryKey: TASKER_KEYS.postedList });
    },
    onError: (err: unknown) => toast.error(getErrorMsg(err)),
  });
}
