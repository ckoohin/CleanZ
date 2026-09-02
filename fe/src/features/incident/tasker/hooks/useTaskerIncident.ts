import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { taskerIncidentApi } from "../services/tasker-incident.service";
import type {
  MyIncidentQuery,
  SubmitStatementInput,
  UpsertDecisionResponseInput,
} from "@/features/incident/shared/incident.types";
import { getErrorMessage } from "@/features/auth/hooks/auth.hooks";
import {
  conflictMessage,
  isConflict,
} from "@/features/incident/shared/incident.errors";

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
    mutationFn: (dto: SubmitStatementInput) =>
      taskerIncidentApi.submitStatement(id, dto),
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
    // Cửa sổ phản hồi trả 409 cho nhiều lý do khác nhau — hết hạn
    // (`TASKER_RESPONSE_WINDOW_EXPIRED`), Admin đã đọc bản này
    // (`TASKER_RESPONSE_ALREADY_REVIEWED`), chưa tới lượt (`TASKER_RESPONSE_NOT_OPEN`) —
    // và người đọc thông báo là người sắp bị trừ tiền. Nói "phiên bản đã thay đổi" cho
    // cả ba là để họ bấm lại một nút không bao giờ ăn, thay vì biết hạn đã trôi qua.
    onError: (e: unknown) => {
      if (isConflict(e)) {
        qc.invalidateQueries({ queryKey: taskerIncidentKeys.detail(id) });
        toast.error(conflictMessage(e));
        return;
      }
      toast.error(getErrorMessage(e));
    },
  });
}
