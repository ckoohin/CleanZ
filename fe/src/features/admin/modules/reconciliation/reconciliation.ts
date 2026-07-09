import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { useQuery } from "@tanstack/react-query";

export type ReconciliationSeverity = "CRITICAL" | "WARNING";

export interface ReconciliationDiscrepancy {
  incidentId: string;
  incidentCode: string | null;
  decisionVersion: number;
  settlementMode: "DIGITAL" | "MANUAL" | "UNKNOWN";
  kind: string;
  severity: ReconciliationSeverity;
  expected: number | null;
  actual: number | null;
  detail: string;
}

export interface ReconciliationReport {
  checkedAt: string;
  checkedCount: number;
  discrepancyCount: number;
  criticalCount: number;
  discrepancies: ReconciliationDiscrepancy[];
}

export const reconciliationApi = {
  get: (): Promise<ReconciliationReport> =>
    http
      .get<ReconciliationReport>(API_ENDPOINTS.ADMIN_INCIDENTS.RECONCILIATION)
      .then((r) => r.data),
};

export function useReconciliation() {
  return useQuery({
    queryKey: ["admin-incident-reconciliation"],
    queryFn: reconciliationApi.get,
    refetchOnWindowFocus: false,
  });
}
