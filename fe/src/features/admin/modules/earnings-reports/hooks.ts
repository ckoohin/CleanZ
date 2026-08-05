import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/features/auth/hooks/auth.hooks";
import {
  earningsReportAdminApi,
  type EarningsReportDeliveryStatus,
  type EarningsReportPeriodType,
  type EarningsReportRun,
  type PreviewEarningsReportParams,
  type SendEarningsReportPayload,
} from "./service";

const keys = {
  all: ["admin-earnings-reports"] as const,
  runs: (params: unknown) => [...keys.all, "runs", params] as const,
  run: (id: string, params: unknown) => [...keys.all, "run", id, params] as const,
};

/** Còn lượt đang chạy thì mới cần polling — trang admin phần lớn thời gian đứng yên. */
const hasRunningRun = (items?: EarningsReportRun[]) =>
  Boolean(items?.some((r) => r.status === "PENDING" || r.status === "RUNNING"));

export function useEarningsReportRuns(params: {
  page?: number;
  limit?: number;
  periodType?: EarningsReportPeriodType;
}) {
  return useQuery({
    queryKey: keys.runs(params),
    queryFn: () => earningsReportAdminApi.listRuns(params),
    refetchInterval: (query) =>
      hasRunningRun(query.state.data?.items) ? 5000 : false,
  });
}

export function useEarningsReportRun(
  id: string | null,
  params: { page?: number; limit?: number; status?: EarningsReportDeliveryStatus },
) {
  return useQuery({
    queryKey: keys.run(id ?? "", params),
    queryFn: () => earningsReportAdminApi.getRun(id!, params),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.run.status;
      return status === "PENDING" || status === "RUNNING" ? 5000 : false;
    },
  });
}

export function useSendEarningsReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SendEarningsReportPayload) =>
      earningsReportAdminApi.send(payload),
    onSuccess: (result) => {
      toast.success(
        result.queuedTaskers > 0
          ? `Đã xếp hàng gửi bảng kê ${result.rangeLabel} cho ${result.queuedTaskers} Tasker`
          : `Kỳ ${result.rangeLabel} không có Tasker nào đủ điều kiện nhận bảng kê`,
      );
      void qc.invalidateQueries({ queryKey: keys.all });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

/** Mở PDF ở tab mới; thu hồi object URL để không giữ blob trong bộ nhớ tab. */
export function usePreviewEarningsReport() {
  return useMutation({
    mutationFn: (params: PreviewEarningsReportParams) =>
      earningsReportAdminApi.previewBlob(params),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) {
        toast.error("Trình duyệt đã chặn cửa sổ mới — hãy cho phép pop-up rồi thử lại");
      }
      // Tab mới cần vài nhịp để đọc xong blob trước khi thu hồi URL.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
