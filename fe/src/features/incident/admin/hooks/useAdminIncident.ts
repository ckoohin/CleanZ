import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  adminIncidentApi,
  adminIncidentLookupApi,
} from "../services/admin-incident.service";
import type {
  AcceptInput,
  AdminIncidentQuery,
  FinalizeDecisionInput,
  FromTicketInput,
  SaveDecisionInput,
  SendToTaskerInput,
} from "@/features/incident/shared/incident.types";
import { getErrorMessage } from "@/features/auth/hooks/auth.hooks";

export const adminIncidentKeys = {
  all: ["admin-incidents"] as const,
  list: (q?: AdminIncidentQuery) => ["admin-incidents", "list", q] as const,
  detail: (id: string) => ["admin-incidents", "detail", id] as const,
};

export function useAdminIncidents(params?: AdminIncidentQuery) {
  return useQuery({
    queryKey: adminIncidentKeys.list(params),
    queryFn: () => adminIncidentApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdminIncidentDetail(id: string) {
  return useQuery({
    queryKey: adminIncidentKeys.detail(id),
    queryFn: () => adminIncidentApi.findOne(id),
    enabled: !!id,
  });
}

/**
 * Mutation hành động admin trên một sự cố: toast, làm mới cache, và xử lý xung
 * đột phiên bản.
 *
 * MỌI hành động phải đi qua đây. Các endpoint nhận `expectedDecisionVersion`
 * (thu hồi quyết định, đảo bồi thường) trả 409 khi bản trên server đã đổi — nếu
 * chỉ toast mà không nạp lại thì admin vẫn cầm version cũ, bấm lại vẫn 409, và
 * chỉ thoát được bằng cách tự tải lại trang.
 */
function useIncidentMutation<TInput>(
  fn: (dto: TInput) => Promise<unknown>,
  successMsg: string,
) {
  const qc = useQueryClient();
  const refresh = () =>
    qc.invalidateQueries({ queryKey: adminIncidentKeys.all });

  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(successMsg);
      refresh();
    },
    onError: (e: unknown) => {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        refresh();
        toast.error(
          "Phiên bản quyết định đã thay đổi. Dữ liệu đã được tải lại.",
        );
        return;
      }
      toast.error(getErrorMessage(e));
    },
  });
}

function useIncidentAction<TInput>(
  id: string,
  fn: (id: string, dto: TInput) => Promise<unknown>,
  successMsg: string,
) {
  return useIncidentMutation<TInput>((dto) => fn(id, dto), successMsg);
}

export const useAcceptIncident = (id: string) =>
  useIncidentAction<AcceptInput>(id, adminIncidentApi.accept, "Đã tiếp nhận xử lý");
export const useSaveDecision = (id: string) =>
  useIncidentAction<SaveDecisionInput>(id, adminIncidentApi.saveDecision, "Đã lưu quyết định");
export const useSendDecisionToTasker = (id: string) =>
  useIncidentAction<SendToTaskerInput>(id, adminIncidentApi.sendDecisionToTasker, "Đã gửi quyết định cho Tasker phản hồi");
export const useFinalizeDecision = (id: string) =>
  useIncidentAction<FinalizeDecisionInput>(id, adminIncidentApi.finalizeDecision, "Đã chốt quyết định");

export const useCompensate = (id: string) =>
  useIncidentMutation<void>(
    () => adminIncidentApi.compensate(id),
    "Đã chi trả bồi thường",
  );

export function useUploadTransferProof() {
  return useMutation({
    mutationFn: (file: File) => adminIncidentApi.uploadTransferProof(file),
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export const useCompensateManual = (id: string) =>
  useIncidentMutation<{ proofEvidenceId: string; note?: string }>(
    (dto) => adminIncidentApi.compensateManual(id, dto),
    "Đã ghi nhận chi trả thủ công (chuyển khoản ngoài)",
  );

export const useReverseCompensation = (id: string) =>
  useIncidentMutation<{ expectedDecisionVersion: number; reason: string }>(
    (dto) => adminIncidentApi.reverseCompensation(id, dto),
    "Đã thu hồi bồi thường — sự cố mở lại để soạn quyết định mới",
  );

export const useWithdrawDecision = (id: string) =>
  useIncidentMutation<{ expectedDecisionVersion: number; reason: string }>(
    (dto) => adminIncidentApi.withdrawDecision(id, dto),
    "Đã thu hồi quyết định — sự cố mở lại để soạn/chốt lại",
  );

export const useWriteOffDebt = (id: string) =>
  useIncidentMutation<string>(
    (reason) => adminIncidentApi.writeOffDebt(id, reason),
    "Đã xoá nợ — nền tảng ghi nhận chịu mất khoản này",
  );

export const useUnlockReporter = (id: string) =>
  useIncidentMutation<void>(
    () => adminIncidentApi.unlockReporter(id),
    "Đã gỡ khoá quyền báo cáo",
  );

export function useCreateFromTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, dto }: { ticketId: string; dto: FromTicketInput }) =>
      adminIncidentApi.createFromTicket(ticketId, dto),
    onSuccess: () => {
      toast.success("Đã tạo sự cố từ ticket");
      qc.invalidateQueries({ queryKey: adminIncidentKeys.all });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useIncidentConfig() {
  return useQuery({
    queryKey: ["admin-incidents", "config"],
    queryFn: () => adminIncidentApi.getConfig(),
  });
}

export function useUpdateIncidentConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, string | number>) => adminIncidentApi.updateConfig(body),
    onSuccess: () => {
      toast.success("Đã cập nhật cấu hình");
      qc.invalidateQueries({ queryKey: ["admin-incidents", "config"] });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useCustomerLookup(keyword: string) {
  const kw = keyword.trim();
  return useQuery({
    queryKey: ["incident-lookup", "customers", kw],
    queryFn: () => adminIncidentLookupApi.searchCustomers(kw),
    enabled: kw.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useTaskerLookup(keyword: string) {
  const kw = keyword.trim();
  return useQuery({
    queryKey: ["incident-lookup", "taskers", kw],
    queryFn: () => adminIncidentLookupApi.searchTaskers(kw),
    enabled: kw.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function usePropertyDamageTicketLookup(keyword: string) {
  const kw = keyword.trim();
  return useQuery({
    queryKey: ["incident-lookup", "pd-tickets", kw],
    queryFn: () => adminIncidentLookupApi.searchPropertyDamageTickets(kw),
    enabled: kw.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
