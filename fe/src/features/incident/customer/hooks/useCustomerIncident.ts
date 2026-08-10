import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { customerIncidentApi } from "../services/customer-incident.service";
import type {
  CreateIncidentInput,
  MyIncidentQuery,
  WithdrawInput,
} from "@/features/incident/shared/incident.types";
import { getErrorMessage } from "@/features/auth/hooks/auth.hooks";

export const incidentKeys = {
  all: ["incidents"] as const,
  mine: (q?: MyIncidentQuery) => ["incidents", "mine", q] as const,
  detail: (id: string) => ["incidents", "detail", id] as const,
};

/**
 * Trần số tiền yêu cầu. Admin sửa được lúc chạy, nên form không được dùng hằng
 * biên dịch cứng — hạ trần thì khách nhập quá rồi bị từ chối, nâng trần thì
 * form chặn oan.
 */
export function useReportConfig() {
  return useQuery({
    queryKey: ["incidents", "report-config"],
    queryFn: () => customerIncidentApi.getReportConfig(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyIncidents(params?: MyIncidentQuery) {
  return useQuery({
    queryKey: incidentKeys.mine(params),
    queryFn: () => customerIncidentApi.listMine(params),
    placeholderData: keepPreviousData,
  });
}

export function useIncidentDetail(id: string) {
  return useQuery({
    queryKey: incidentKeys.detail(id),
    queryFn: () => customerIncidentApi.findOne(id),
    enabled: !!id,
  });
}

export function useUploadEvidence() {
  return useMutation({
    mutationFn: (file: File) => customerIncidentApi.uploadEvidence(file),
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useCreateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateIncidentInput) => customerIncidentApi.create(dto),
    onSuccess: () => {
      toast.success("Đã gửi báo cáo sự cố");
      qc.invalidateQueries({ queryKey: incidentKeys.all });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

/** P1.4 — Bổ sung bằng chứng cho hạng mục bị yêu cầu (NEED_MORE_EVIDENCE). */
export function useAttachItemEvidence(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, evidenceIds }: { itemId: string; evidenceIds: string[] }) =>
      customerIncidentApi.attachItemEvidence(id, itemId, evidenceIds),
    onSuccess: () => {
      toast.success("Đã gửi thêm ảnh — chờ CleanZ xem xét lại");
      qc.invalidateQueries({ queryKey: incidentKeys.detail(id) });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useWithdrawIncident(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: WithdrawInput) => customerIncidentApi.withdraw(id, dto),
    onSuccess: () => {
      toast.success("Đã rút báo cáo sự cố");
      qc.invalidateQueries({ queryKey: incidentKeys.detail(id) });
      qc.invalidateQueries({ queryKey: incidentKeys.all });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
