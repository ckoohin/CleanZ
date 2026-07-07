import http from "@/lib/api/http";

export type WithdrawalStatus = "PENDING" | "APPROVED" | "REJECTED" | "PROCESSED";

export interface AdminCustomerWithdrawal {
  id: string;
  amount: number;
  status: WithdrawalStatus;
  bankAccount: string | null;
  bankName: string | null;
  note: string | null;
  adminNote: string | null;
  reviewedAt: string | null;
  processedAt: string | null;
  createdAt: string;
  customer?: { id: string; user?: { fullName?: string | null } | null } | null;
}

export interface ReviewCustomerWithdrawalPayload {
  status: "APPROVED" | "REJECTED";
  adminNote?: string;
}

const BASE = "/wallet/admin/customer-withdrawals";

export const customerWithdrawalAdminApi = {
  list: (status?: WithdrawalStatus): Promise<AdminCustomerWithdrawal[]> =>
    http
      .get<AdminCustomerWithdrawal[]>(BASE, { params: status ? { status } : {} })
      .then((r) => r.data),

  review: (
    id: string,
    payload: ReviewCustomerWithdrawalPayload,
  ): Promise<AdminCustomerWithdrawal> =>
    http.patch<AdminCustomerWithdrawal>(`${BASE}/${id}/review`, payload).then((r) => r.data),
};
