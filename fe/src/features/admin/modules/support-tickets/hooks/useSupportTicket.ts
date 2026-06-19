import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supportTicketAdminApi } from "../services/support-ticket.service";
import type {
  AdminTicketQueryParams,
  AssignTicketDto,
  ChangeStatusDto,
  CreateAdminMessageDto,
  CreateResolutionDto,
  CreateTicketOnBehalfDto,
  ReclassifyTicketDto,
  UpdateTicketConfigDto,
} from "../types/support-ticket.types";
import { getErrorMessage } from "@/features/auth/hooks/auth.hooks";

// ─── Query Keys ──────────────────────────────────────────────────────────────
export const supportTicketKeys = {
  all: ["admin-support-tickets"] as const,
  list: (params?: AdminTicketQueryParams) =>
    ["admin-support-tickets", "list", params] as const,
  detail: (id: string) => ["admin-support-tickets", "detail", id] as const,
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
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
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

// ─── Detail ──────────────────────────────────────────────────────────────────
export function useTicketDetail(id: string) {
  return useQuery({
    queryKey: supportTicketKeys.detail(id),
    queryFn: () => supportTicketAdminApi.findOne(id),
    enabled: !!id,
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
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
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
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
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
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

// ─── Add Message ──────────────────────────────────────────────────────────────
export function useAddTicketMessage(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAdminMessageDto) =>
      supportTicketAdminApi.addMessage(id, dto),
    onSuccess: (_, variables) => {
      toast.success(
        variables.isInternal ? "Đã thêm internal note" : "Đã gửi tin nhắn"
      );
      queryClient.invalidateQueries({ queryKey: supportTicketKeys.detail(id) });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
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
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
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
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}
