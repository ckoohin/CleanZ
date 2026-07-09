import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import type {
  CreateIncidentInput,
  Evidence,
  IncidentCustomerView,
  MyIncidentQuery,
  Paginated,
  IncidentSummary,
  WithdrawInput,
} from "@/features/incident/shared/incident.types";

const EP = API_ENDPOINTS.INCIDENTS;

export const customerIncidentApi = {
  /** Upload 1 ảnh bằng chứng (trước khi tạo) → trả evidenceId để tham chiếu. */
  uploadEvidence: (file: File): Promise<Evidence> => {
    const fd = new FormData();
    fd.append("file", file);
    return http
      .post<Evidence>(EP.EVIDENCES, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  create: (dto: CreateIncidentInput): Promise<IncidentCustomerView> =>
    http.post<IncidentCustomerView>(EP.BASE, dto).then((r) => r.data),

  listMine: (params?: MyIncidentQuery): Promise<Paginated<IncidentSummary>> =>
    http.get<Paginated<IncidentSummary>>(EP.MINE, { params }).then((r) => r.data),

  findOne: (id: string): Promise<IncidentCustomerView> =>
    http.get<IncidentCustomerView>(EP.DETAIL(id)).then((r) => r.data),

  withdraw: (id: string, dto: WithdrawInput): Promise<IncidentCustomerView> =>
    http.patch<IncidentCustomerView>(EP.WITHDRAW(id), dto).then((r) => r.data),

  /** P1.4 — Gắn evidence đã upload vào hạng mục bị yêu cầu bổ sung. */
  attachItemEvidence: (
    id: string,
    itemId: string,
    evidenceIds: string[],
  ): Promise<IncidentCustomerView> =>
    http
      .post<IncidentCustomerView>(EP.ITEM_EVIDENCES(id, itemId), { evidenceIds })
      .then((r) => r.data),
};
