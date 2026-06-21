import http from "@/lib/api/http";
import type {
  FinancialOverview,
  PaginatedWithdrawals,
  ReviewWithdrawalPayload,
  WithdrawalListQuery,
  WithdrawalRequest,
} from "../types/withdrawal.types";

const BASE = "/admin/finance";

export const withdrawalAdminApi = {
  getOverview: (): Promise<FinancialOverview> =>
    http
      .get(`${BASE}/overview`)
      .then((response) => response.data.data),

  list: (params?: WithdrawalListQuery): Promise<PaginatedWithdrawals> =>
    http
      .get(`${BASE}/withdrawals`, { params })
      .then((response) => response.data.data),

  findOne: (id: string): Promise<WithdrawalRequest> =>
    http
      .get(`${BASE}/withdrawals/${id}`)
      .then((response) => response.data.data),

  review: (
    id: string,
    payload: ReviewWithdrawalPayload,
  ): Promise<WithdrawalRequest> =>
    http
      .patch(`${BASE}/withdrawals/${id}/review`, payload)
      .then((response) => response.data.data),
};
