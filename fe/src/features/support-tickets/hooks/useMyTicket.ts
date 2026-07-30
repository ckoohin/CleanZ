import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  list: (params?: MyTicketQueryParams) =>
    ["my-tickets", "list", params] as const,
  detail: (id: string) => ["my-tickets", "detail", id] as const,
};

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
export function useMyTicketList(params?: MyTicketQueryParams) {
  return useQuery({
    queryKey: myTicketKeys.list(params),
    queryFn: () => myTicketApi.listMine(params),
    placeholderData: (prev) => prev,
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

