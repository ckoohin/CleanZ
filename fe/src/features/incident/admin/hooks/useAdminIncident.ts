import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminIncidentApi,
  adminIncidentLookupApi,
} from "../services/admin-incident.service";
import type {
  AcceptInput,
  AdminIncidentQuery,
  ApproveCompensationInput,
  DecideInput,
  FromTicketInput,
  VerifyItemsInput,
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

/** Helper tạo mutation hành động admin: invalidate detail+list, toast. */
function useIncidentAction<TInput>(
  id: string,
  fn: (id: string, dto: TInput) => Promise<unknown>,
  successMsg: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: TInput) => fn(id, dto),
    onSuccess: () => {
      toast.success(successMsg);
      qc.invalidateQueries({ queryKey: adminIncidentKeys.detail(id) });
      qc.invalidateQueries({ queryKey: adminIncidentKeys.all });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export const useAcceptIncident = (id: string) =>
  useIncidentAction<AcceptInput>(id, adminIncidentApi.accept, "Đã tiếp nhận thẩm định");
export const useVerifyItems = (id: string) =>
  useIncidentAction<VerifyItemsInput>(id, adminIncidentApi.verifyItems, "Đã xác minh thiệt hại");
export const useDecideIncident = (id: string) =>
  useIncidentAction<DecideInput>(id, adminIncidentApi.decide, "Đã ghi nhận quyết định");
export const useApproveCompensation = (id: string) =>
  useIncidentAction<ApproveCompensationInput>(id, adminIncidentApi.approveCompensation, "Đã duyệt cấp 2");

export function useCompensate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminIncidentApi.compensate(id),
    onSuccess: () => {
      toast.success("Đã thực thi bồi thường");
      qc.invalidateQueries({ queryKey: adminIncidentKeys.detail(id) });
      qc.invalidateQueries({ queryKey: adminIncidentKeys.all });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useUnlockReporter(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminIncidentApi.unlockReporter(id),
    onSuccess: () => {
      toast.success("Đã gỡ khoá quyền báo cáo");
      qc.invalidateQueries({ queryKey: adminIncidentKeys.detail(id) });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

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
