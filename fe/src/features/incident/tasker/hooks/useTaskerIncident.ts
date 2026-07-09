import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskerIncidentApi } from "../services/tasker-incident.service";
import type {
  MyIncidentQuery,
  SubmitStatementInput,
  UpsertDecisionResponseInput,
} from "@/features/incident/shared/incident.types";
import { getErrorMessage } from "@/features/auth/hooks/auth.hooks";

export const taskerIncidentKeys = {
  all: ["tasker-incidents"] as const,
  mine: (q?: MyIncidentQuery) => ["tasker-incidents", "mine", q] as const,
  detail: (id: string) => ["tasker-incidents", "detail", id] as const,
};

export function useTaskerIncidents(params?: MyIncidentQuery) {
  return useQuery({
    queryKey: taskerIncidentKeys.mine(params),
    queryFn: () => taskerIncidentApi.listMine(params),
    placeholderData: keepPreviousData,
  });
}

export function useTaskerIncidentDetail(id: string) {
  return useQuery({
    queryKey: taskerIncidentKeys.detail(id),
    queryFn: () => taskerIncidentApi.findOne(id),
    enabled: !!id,
  });
}

export function useTaskerUploadEvidence() {
  return useMutation({
    mutationFn: (file: File) => taskerIncidentApi.uploadEvidence(file),
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useSubmitStatement(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: SubmitStatementInput) => taskerIncidentApi.submitStatement(id, dto),
    onSuccess: () => {
      toast.success("Đã gửi giải trình");
      qc.invalidateQueries({ queryKey: taskerIncidentKeys.detail(id) });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useUpsertDecisionResponse(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpsertDecisionResponseInput) =>
      taskerIncidentApi.upsertDecisionResponse(id, dto),
    onSuccess: () => {
      toast.success("Đã gửi phản hồi quyết định");
      qc.invalidateQueries({ queryKey: taskerIncidentKeys.detail(id) });
    },
    onError: (e: unknown) => {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        qc.invalidateQueries({ queryKey: taskerIncidentKeys.detail(id) });
        toast.error("Phiên bản quyết định đã thay đổi. Dữ liệu đã được tải lại.");
        return;
      }
      toast.error(getErrorMessage(e));
    },
  });
}
