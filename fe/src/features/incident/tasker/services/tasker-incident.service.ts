import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import type {
  Evidence,
  IncidentSummary,
  IncidentTaskerView,
  MyIncidentQuery,
  Paginated,
  Statement,
  SubmitStatementInput,
  DecisionResponseView,
  UpsertDecisionResponseInput,
} from "@/features/incident/shared/incident.types";

const EP = API_ENDPOINTS.TASKER_INCIDENTS;

export const taskerIncidentApi = {
  /** Upload ảnh bằng chứng cho giải trình (trước khi gửi statement). */
  uploadEvidence: (file: File): Promise<Evidence> => {
    const fd = new FormData();
    fd.append("file", file);
    return http
      .post<Evidence>(EP.EVIDENCES, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  listMine: (params?: MyIncidentQuery): Promise<Paginated<IncidentSummary>> =>
    http.get<Paginated<IncidentSummary>>(EP.MINE, { params }).then((r) => r.data),

  findOne: (id: string): Promise<IncidentTaskerView> =>
    http.get<IncidentTaskerView>(EP.DETAIL(id)).then((r) => r.data),

  submitStatement: (id: string, dto: SubmitStatementInput): Promise<Statement> =>
    http.post<Statement>(EP.STATEMENTS(id), dto).then((r) => r.data),

  upsertDecisionResponse: (
    id: string,
    dto: UpsertDecisionResponseInput,
  ): Promise<DecisionResponseView> =>
    http.put<DecisionResponseView>(EP.DECISION_RESPONSE(id), dto).then((r) => r.data),
};
