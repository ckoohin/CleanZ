import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { useSocketEvent } from "@/hooks/use-socket";
import { supportTicketAdminApi } from "../services/support-ticket.service";
import type {
  AdminTicketQueryParams,
  AssignTicketDto,
  ChangeStatusDto,
  CreateResolutionDto,
  CreateTicketOnBehalfDto,
  ReclassifyTicketDto,
  UpdateTicketConfigDto,
} from "../types/support-ticket.types";

// ─── Query Keys ──────────────────────────────────────────────────────────────
export const supportTicketKeys = {
  all: ["admin-support-tickets"] as const,
  list: (params?: AdminTicketQueryParams) =>
    ["admin-support-tickets", "list", params] as const,
  detail: (id: string) => ["admin-support-tickets", "detail", id] as const,
  internalNotes: (id: string) =>
    ["admin-support-tickets", "internal-notes", id] as const,
  config: ["admin-support-tickets", "config"] as const,
};

// ─── Config ──────────────────────────────────────────────────────────────────
export function useTicketConfig() {
  return useQuery({
    queryKey: supportTicketKeys.config,
    queryFn: supportTicketAdminApi.getConfig,
  });
}

export function useUpdateTicketConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateTicketConfigDto) =>
      supportTicketAdminApi.updateConfig(dto),
    onSuccess: () => {
      toast.success("Đã cập nhật cấu hình ticket");
      queryClient.invalidateQueries({ queryKey: supportTicketKeys.config });
    },
  });
}

// ─── Thống kê vận hành ────────────────────────────────────────────────────────
export function useTicketStats(params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ["admin-support-tickets", "stats", params],
    queryFn: () => supportTicketAdminApi.getStats(params),
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Gán hàng loạt ────────────────────────────────────────────────────────────
export function useBulkAssign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ticketIds,
      assignedAdminId,
    }: {
      ticketIds: string[];
      assignedAdminId?: string;
    }) => supportTicketAdminApi.bulkAssign(ticketIds, assignedAdminId),
    onSuccess: (res) => {
      // Thao tác hàng loạt "làm được gì làm nấy" → báo cáo cả phần bị bỏ qua.
      if (res.skipped.length > 0) {
        toast.success(
          `Đã gán ${res.assigned} ticket. Bỏ qua ${res.skipped.length} ticket đang do admin khác phụ trách.`,
        );
      } else {
        toast.success(`Đã gán ${res.assigned} ticket`);
      }
      queryClient.invalidateQueries({ queryKey: supportTicketKeys.all });
    },
  });
}

// ─── List ─────────────────────────────────────────────────────────────────────
export function useTicketList(params?: AdminTicketQueryParams) {
  return useQuery({
    queryKey: supportTicketKeys.list(params),
    queryFn: () => supportTicketAdminApi.list(params),
    placeholderData: (prev) => prev,
  });
}

// ─── Unread realtime (badge ngoài ticket) ─────────────────────────────────────
export function useAdminTicketUnreadTotal() {
  return useQuery({
    queryKey: ["admin-support-tickets", "unread-total"],
    queryFn: () => supportTicketAdminApi.unreadTotal(),
    staleTime: 30 * 1000,
  });
}

/** Realtime: có tin mới của user → làm mới hàng đợi để badge cập nhật. */
export function useAdminTicketUnreadRealtime() {
  const queryClient = useQueryClient();
  useSocketEvent("ticket:unread", () => {
    queryClient.invalidateQueries({ queryKey: supportTicketKeys.all });
    queryClient.invalidateQueries({
      queryKey: ["admin-support-tickets", "unread-total"],
    });
  });
}

// ─── Detail ──────────────────────────────────────────────────────────────────
export function useTicketDetail(id: string) {
  return useQuery({
    queryKey: supportTicketKeys.detail(id),
    queryFn: () => supportTicketAdminApi.findOne(id),
    enabled: !!id,
  });
}

// ─── Ghi chú nội bộ (log) ────────────────────────────────────────────────────
export function useInternalNotes(id: string, enabled = true) {
  return useQuery({
    queryKey: supportTicketKeys.internalNotes(id),
    queryFn: () => supportTicketAdminApi.listInternalNotes(id),
    enabled: !!id && enabled,
  });
}

export function useAddInternalNote(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      supportTicketAdminApi.addInternalNote(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: supportTicketKeys.internalNotes(id),
      });
    },
  });
}

// ─── Create on Behalf ────────────────────────────────────────────────────────
export function useCreateTicketOnBehalf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTicketOnBehalfDto) =>
      supportTicketAdminApi.createOnBehalf(dto),
    onSuccess: () => {
      toast.success("Đã tạo ticket thành công");
      queryClient.invalidateQueries({ queryKey: supportTicketKeys.all });
    },
  });
}

// ─── Assign ──────────────────────────────────────────────────────────────────
export function useAssignTicket(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: AssignTicketDto) =>
      supportTicketAdminApi.assign(id, dto),
    onSuccess: () => {
      toast.success("Đã gán admin xử lý");
      queryClient.invalidateQueries({ queryKey: supportTicketKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: supportTicketKeys.all });
    },
  });
}

// ─── Change Status ────────────────────────────────────────────────────────────
export function useChangeTicketStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: ChangeStatusDto) =>
      supportTicketAdminApi.changeStatus(id, dto),
    onSuccess: () => {
      toast.success("Đã cập nhật trạng thái ticket");
      queryClient.invalidateQueries({ queryKey: supportTicketKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: supportTicketKeys.all });
    },
  });
}

// ─── Add Resolution ───────────────────────────────────────────────────────────
export function useAddResolution(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateResolutionDto) =>
      supportTicketAdminApi.addResolution(id, dto),
    onSuccess: () => {
      toast.success("Đã ghi nhận kết luận xử lý");
      queryClient.invalidateQueries({ queryKey: supportTicketKeys.detail(id) });
    },
  });
}

// ─── Reclassify ───────────────────────────────────────────────────────────────
export function useReclassifyTicket(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: ReclassifyTicketDto) =>
      supportTicketAdminApi.reclassify(id, dto),
    onSuccess: () => {
      toast.success("Đã phân loại lại ticket");
      queryClient.invalidateQueries({ queryKey: supportTicketKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: supportTicketKeys.all });
    },
  });
}
