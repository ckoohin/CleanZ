import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { useSocketEvent } from "@/hooks/use-socket";
import { myTicketApi } from "../services/my-ticket.service";
import type {
  CreateTicketDto,
  MyTicketQueryParams,
  SubmitSurveyDto,
} from "../types/my-ticket.types";

// ─── Query Keys ──────────────────────────────────────────────────────────────
export const myTicketKeys = {
  all: ["my-tickets"] as const,
  infinite: (params?: Omit<MyTicketQueryParams, "page">) =>
    ["my-tickets", "list-infinite", params] as const,
  detail: (id: string) => ["my-tickets", "detail", id] as const,
};

/** Số ticket mỗi lần tải (danh sách cuộn vô hạn ở mobile). */
export const MY_TICKET_PAGE_SIZE = 20;

// ─── Booking options (cho select khi tạo ticket) ──────────────────────────────
export function useMyBookings(enabled = true) {
  return useQuery({
    queryKey: ["my-bookings", "for-ticket"],
    queryFn: () => myTicketApi.listMyBookings(),
    enabled,
    staleTime: 60 * 1000,
  });
}

// ─── List ─────────────────────────────────────────────────────────────────────
/**
 * Danh sách ticket dạng CUỘN VÔ HẠN (mobile). Trước đây màn hình gọi
 * `useMyTicketList({ page: 1, limit: 20 })` cứng nên người dùng có hơn 20 ticket
 * không thể xem tiếp — không nút "xem thêm", không phân trang.
 *
 * Khoá query nằm dưới tiền tố `my-tickets` để realtime `ticket:unread` (đang
 * invalidate `myTicketKeys.all`) vẫn làm mới được danh sách.
 */
export function useMyTicketInfiniteList(
  params?: Omit<MyTicketQueryParams, "page">,
) {
  const limit = params?.limit ?? MY_TICKET_PAGE_SIZE;
  return useInfiniteQuery({
    queryKey: myTicketKeys.infinite({ ...params, limit }),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      myTicketApi.listMine({ ...params, limit, page: pageParam }),
    // Hết trang khi đã tới `totalPages` (BE trả meta đầy đủ).
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
  });
}

// ─── Unread (badge ngoài ticket) ───────────────────────────────────────────────
export function useMyTicketUnreadTotal() {
  return useQuery({
    queryKey: ["my-tickets", "unread-total"],
    queryFn: () => myTicketApi.unreadTotal(),
    staleTime: 30 * 1000,
  });
}

/** Realtime: tin mới (kể cả khi không mở ticket) → làm mới list + tổng chưa đọc. */
export function useMyTicketUnreadRealtime() {
  const queryClient = useQueryClient();
  useSocketEvent("ticket:unread", () => {
    queryClient.invalidateQueries({ queryKey: myTicketKeys.all });
    queryClient.invalidateQueries({ queryKey: ["my-tickets", "unread-total"] });
  });
}

// ─── Detail ──────────────────────────────────────────────────────────────────
export function useMyTicketDetail(id: string) {
  return useQuery({
    queryKey: myTicketKeys.detail(id),
    queryFn: () => myTicketApi.findOne(id),
    enabled: !!id,
  });
}

// ─── Create ──────────────────────────────────────────────────────────────────
export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTicketDto) => myTicketApi.create(dto),
    onSuccess: () => {
      toast.success("Đã gửi yêu cầu hỗ trợ thành công!");
      queryClient.invalidateQueries({ queryKey: myTicketKeys.all });
    },
  });
}

// ─── Mở lại ticket đã đóng ────────────────────────────────────────────────────
export function useReopenTicket(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => myTicketApi.reopen(id, reason),
    onSuccess: () => {
      toast.success("Đã mở lại yêu cầu — CleanZ sẽ tiếp tục xử lý");
      queryClient.invalidateQueries({ queryKey: myTicketKeys.all });
    },
  });
}

// ─── Submit Survey (CSAT) ─────────────────────────────────────────────────────
export function useSubmitSurvey(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: SubmitSurveyDto) => myTicketApi.submitSurvey(id, dto),
    onSuccess: () => {
      toast.success("Cảm ơn bạn đã đánh giá dịch vụ hỗ trợ!");
      queryClient.invalidateQueries({ queryKey: myTicketKeys.detail(id) });
    },
  });
}

