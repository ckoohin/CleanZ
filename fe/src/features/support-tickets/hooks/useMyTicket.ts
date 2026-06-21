import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { myTicketApi } from "../services/my-ticket.service";
import type {
  CreateTicketDto,
  MyTicketQueryParams,
  SendMessageDto,
  SubmitSurveyDto,
} from "../types/my-ticket.types";
import { getErrorMessage } from "@/features/auth/hooks/auth.hooks";

// ─── Query Keys ──────────────────────────────────────────────────────────────
export const myTicketKeys = {
  all: ["my-tickets"] as const,
  list: (params?: MyTicketQueryParams) =>
    ["my-tickets", "list", params] as const,
  detail: (id: string) => ["my-tickets", "detail", id] as const,
};

// ─── List ─────────────────────────────────────────────────────────────────────
export function useMyTicketList(params?: MyTicketQueryParams) {
  return useQuery({
    queryKey: myTicketKeys.list(params),
    queryFn: () => myTicketApi.listMine(params),
    placeholderData: (prev) => prev,
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
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

// ─── Send Message ────────────────────────────────────────────────────────────
export function useSendMyTicketMessage(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: SendMessageDto) => myTicketApi.sendMessage(id, dto),
    onSuccess: () => {
      toast.success("Đã gửi tin nhắn");
      queryClient.invalidateQueries({ queryKey: myTicketKeys.detail(id) });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
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
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

// ─── Upload Attachment ────────────────────────────────────────────────────────
export function useUploadTicketAttachment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => myTicketApi.uploadAttachment(id, file),
    onSuccess: () => {
      toast.success("Đã upload ảnh bằng chứng");
      queryClient.invalidateQueries({ queryKey: myTicketKeys.detail(id) });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}
