import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/features/auth/hooks/auth.hooks";

const EP = API_ENDPOINTS.ADMIN_BANK_STATEMENT;

export type BankStatementDirection = "DEBIT" | "CREDIT";
export type BankStatementStatus = "UNMATCHED" | "MATCHED" | "IGNORED";

export interface BankStatementEntry {
  id: string;
  bankRef: string;
  txnAt: string;
  direction: BankStatementDirection;
  amount: number;
  counterpartyAccount: string | null;
  counterpartyName: string | null;
  description: string | null;
  status: BankStatementStatus;
  note: string | null;
  matchedIncident: { id: string; incidentCode: string | null } | null;
  matchedAt: string | null;
}

/** Gợi ý kèm LÝ DO — người xác nhận cần biết vì sao dòng này được đề xuất. */
export interface BankStatementSuggestion extends BankStatementEntry {
  reasons: string[];
  score: number;
}

export interface BankStatementImportResult {
  parsed: number;
  inserted: number;
  duplicated: number;
  errors: { line: number; message: string }[];
}

export const bankStatementApi = {
  import: (csv: string): Promise<BankStatementImportResult> =>
    http
      .post<BankStatementImportResult>(EP.IMPORT, { csv })
      .then((r) => r.data),

  list: (params: {
    status?: BankStatementStatus;
    keyword?: string;
    limit?: number;
  }): Promise<BankStatementEntry[]> =>
    http.get<BankStatementEntry[]>(EP.ENTRIES, { params }).then((r) => r.data),

  forIncident: (incidentId: string): Promise<BankStatementEntry[]> =>
    http
      .get<BankStatementEntry[]>(EP.FOR_INCIDENT(incidentId))
      .then((r) => r.data),

  suggestions: (incidentId: string): Promise<BankStatementSuggestion[]> =>
    http
      .get<BankStatementSuggestion[]>(EP.SUGGESTIONS(incidentId))
      .then((r) => r.data),

  match: (id: string, incidentId: string): Promise<BankStatementEntry> =>
    http
      .post<BankStatementEntry>(EP.MATCH(id), { incidentId })
      .then((r) => r.data),

  unmatch: (id: string, reason: string): Promise<BankStatementEntry> =>
    http
      .post<BankStatementEntry>(EP.UNMATCH(id), { reason })
      .then((r) => r.data),

  ignore: (id: string, reason: string): Promise<BankStatementEntry> =>
    http
      .post<BankStatementEntry>(EP.IGNORE(id), { reason })
      .then((r) => r.data),
};

export const bankStatementKeys = {
  all: ["admin-bank-statement"] as const,
  list: (params: unknown) => ["admin-bank-statement", "list", params] as const,
  forIncident: (id: string) =>
    ["admin-bank-statement", "incident", id] as const,
  suggestions: (id: string) =>
    ["admin-bank-statement", "suggestions", id] as const,
};

export function useBankStatementEntries(params: {
  status?: BankStatementStatus;
  keyword?: string;
}) {
  return useQuery({
    queryKey: bankStatementKeys.list(params),
    queryFn: () => bankStatementApi.list(params),
  });
}

export function useIncidentBankEntries(incidentId: string, enabled: boolean) {
  return useQuery({
    queryKey: bankStatementKeys.forIncident(incidentId),
    queryFn: () => bankStatementApi.forIncident(incidentId),
    enabled,
  });
}

export function useBankSuggestions(incidentId: string, enabled: boolean) {
  return useQuery({
    queryKey: bankStatementKeys.suggestions(incidentId),
    queryFn: () => bankStatementApi.suggestions(incidentId),
    enabled,
  });
}

/**
 * Mọi thao tác sao kê đều làm mới CẢ báo cáo đối soát: khớp một dòng là thay đổi kết luận
 * "khoản chi này đã được ngân hàng xác nhận chưa", mà kết luận đó hiển thị ở màn khác.
 */
function useBankMutation<TInput, TResult>(
  fn: (input: TInput) => Promise<TResult>,
  successMsg: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(successMsg);
      void qc.invalidateQueries({ queryKey: bankStatementKeys.all });
      void qc.invalidateQueries({
        queryKey: ["admin-incident-reconciliation"],
      });
      void qc.invalidateQueries({ queryKey: ["admin-incidents"] });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export const useImportBankStatement = () =>
  useBankMutation<string, BankStatementImportResult>(
    (csv) => bankStatementApi.import(csv),
    "Đã nhập sao kê",
  );

export const useMatchBankEntry = () =>
  useBankMutation<{ entryId: string; incidentId: string }, BankStatementEntry>(
    ({ entryId, incidentId }) => bankStatementApi.match(entryId, incidentId),
    "Đã đối chiếu dòng sao kê với khoản chi",
  );

export const useUnmatchBankEntry = () =>
  useBankMutation<{ entryId: string; reason: string }, BankStatementEntry>(
    ({ entryId, reason }) => bankStatementApi.unmatch(entryId, reason),
    "Đã gỡ đối chiếu",
  );

export const useIgnoreBankEntry = () =>
  useBankMutation<{ entryId: string; reason: string }, BankStatementEntry>(
    ({ entryId, reason }) => bankStatementApi.ignore(entryId, reason),
    "Đã đánh dấu bỏ qua",
  );
