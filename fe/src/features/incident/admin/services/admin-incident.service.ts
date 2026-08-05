import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import type {
  AcceptInput,
  AdminIncidentExportQuery,
  AdminIncidentQuery,
  IncidentDateRangeQuery,
  FinalizeDecisionInput,
  FromTicketInput,
  IncidentAdminView,
  IncidentConfigMap,
  IncidentSummary,
  Paginated,
  SaveDecisionInput,
  SendToTaskerInput,
} from "@/features/incident/shared/incident.types";

const EP = API_ENDPOINTS.ADMIN_INCIDENTS;

export const adminIncidentApi = {
  list: (params?: AdminIncidentQuery): Promise<Paginated<IncidentSummary>> =>
    http.get<Paginated<IncidentSummary>>(EP.BASE, { params }).then((r) => r.data),

  findOne: (id: string): Promise<IncidentAdminView> =>
    http.get<IncidentAdminView>(EP.DETAIL(id)).then((r) => r.data),

  // ── Xuất Excel ───────────────────────────────────────────────────────────
  // `responseType: 'blob'` là bắt buộc: bỏ đi thì axios cố parse .xlsx thành
  // chuỗi và file tải về hỏng, không mở được.
  exportList: (params?: AdminIncidentExportQuery): Promise<Blob> =>
    http
      .get<Blob>(EP.EXPORT_LIST, { params, responseType: "blob" })
      .then((r) => r.data),

  exportReport: (params: IncidentDateRangeQuery): Promise<Blob> =>
    http
      .get<Blob>(EP.EXPORT_REPORT, { params, responseType: "blob" })
      .then((r) => r.data),

  accept: (id: string, dto: AcceptInput): Promise<IncidentAdminView> =>
    http.patch<IncidentAdminView>(EP.ACCEPT(id), dto).then((r) => r.data),

  /** Soạn/sửa quyết định (upsert) — thay cho cặp verify + saveDraft + revise cũ. */
  saveDecision: (
    id: string,
    dto: SaveDecisionInput,
  ): Promise<IncidentAdminView> =>
    http.put<IncidentAdminView>(EP.DECISION(id), dto).then((r) => r.data),

  sendDecisionToTasker: (
    id: string,
    dto: SendToTaskerInput,
  ): Promise<IncidentAdminView> =>
    http.post<IncidentAdminView>(EP.DECISION_SEND(id), dto).then((r) => r.data),

  finalizeDecision: (
    id: string,
    dto: FinalizeDecisionInput,
  ): Promise<IncidentAdminView> =>
    http.post<IncidentAdminView>(EP.DECISION_FINALIZE(id), dto).then((r) => r.data),

  /**
   * Thu hồi quyết định đã chốt nhưng CHƯA chi trả — sửa sai trước khi tiền rời ví, thay vì
   * phải chi rồi mới đảo.
   */
  withdrawDecision: (
    id: string,
    dto: { expectedDecisionVersion: number; reason: string },
  ): Promise<IncidentAdminView> =>
    http.post<IncidentAdminView>(EP.DECISION_WITHDRAW(id), dto).then((r) => r.data),

  /** Xoá nợ không thu hồi được — nền tảng chịu mất, mở lối đóng hồ sơ. */
  writeOffDebt: (id: string, reason: string): Promise<IncidentAdminView> =>
    http.post<IncidentAdminView>(EP.DEBT_WRITE_OFF(id), { reason }).then((r) => r.data),

  reverseCompensation: (
    id: string,
    dto: { expectedDecisionVersion: number; reason: string },
  ): Promise<IncidentAdminView> =>
    http.post<IncidentAdminView>(EP.COMPENSATION_REVERSE(id), dto).then((r) => r.data),

  /** P0.4 — upload ảnh minh chứng chuyển khoản (chi trả thủ công). */
  uploadTransferProof: (file: File): Promise<{ id: string; url: string }> => {
    const fd = new FormData();
    fd.append("file", file);
    return http
      .post<{ id: string; url: string }>(EP.TRANSFER_PROOF, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  /** P0.4 — chi trả thủ công (chuyển khoản ngoài) khi quỹ SYSTEM không đủ. */
  compensateManual: (
    id: string,
    dto: { proofEvidenceId: string; note?: string },
  ): Promise<IncidentAdminView> =>
    http.post<IncidentAdminView>(EP.COMPENSATE_MANUAL(id), dto).then((r) => r.data),

  compensate: (id: string): Promise<IncidentAdminView> =>
    http.post<IncidentAdminView>(EP.COMPENSATE(id), {}).then((r) => r.data),

  createFromTicket: (ticketId: string, dto: FromTicketInput): Promise<IncidentAdminView> =>
    http.post<IncidentAdminView>(EP.FROM_TICKET(ticketId), dto).then((r) => r.data),

  unlockReporter: (id: string): Promise<IncidentAdminView> =>
    http.patch<IncidentAdminView>(EP.UNLOCK_REPORTER(id), {}).then((r) => r.data),

  getConfig: (): Promise<IncidentConfigMap> =>
    http.get<IncidentConfigMap>(EP.CONFIG).then((r) => r.data),

  updateConfig: (body: Record<string, string | number>): Promise<IncidentConfigMap> =>
    http.put<IncidentConfigMap>(EP.CONFIG, body).then((r) => r.data),
};

// ─── Lookup (filter tra cứu) — normalize về {id,label,sub} ────────────────────
export interface LookupItem {
  id: string;
  label: string;
  sub?: string;
}

/** Bóc mảng từ nhiều dạng vỏ response: {data:{data|items:[]}} | {data|items:[]} | []. */
function unwrapArray(body: unknown): Record<string, unknown>[] {
  const lvl1 = Array.isArray(body) ? body : (body as Record<string, unknown>)?.data;
  const lvl1arr = Array.isArray(lvl1)
    ? lvl1
    : ((lvl1 as Record<string, unknown>)?.data ??
      (lvl1 as Record<string, unknown>)?.items ??
      (body as Record<string, unknown>)?.items);
  return Array.isArray(lvl1arr) ? (lvl1arr as Record<string, unknown>[]) : [];
}

export const adminIncidentLookupApi = {
  searchCustomers: (keyword: string): Promise<LookupItem[]> =>
    http
      .get<unknown>("/admin/customers", { params: { keyword, limit: 10 } })
      .then((r) =>
        unwrapArray(r.data).map((c) => ({
          id: String(c.id),
          label: String(c.fullName ?? "—"),
          sub: [c.phone, c.email].filter(Boolean).join(" · ") || undefined,
        })),
      ),

  searchTaskers: (keyword: string): Promise<LookupItem[]> =>
    http
      .get<unknown>("/tasker/admin", { params: { keyword, limit: 10 } })
      .then((r) =>
        unwrapArray(r.data).map((t) => ({
          id: String(t.id),
          label: String(t.fullName ?? t.name ?? "—"),
          sub: (t.phone as string) || undefined,
        })),
      ),

  /** Ticket PROPERTY_DAMAGE để nâng cấp thành Incident — kèm SĐT người báo cáo. */
  searchPropertyDamageTickets: (keyword: string): Promise<LookupItem[]> =>
    http
      .get<unknown>("/admin/support-tickets", {
        params: { category: "PROPERTY_DAMAGE", keyword, limit: 10 },
      })
      .then((r) =>
        unwrapArray(r.data).map((t) => {
          const reporter = t.reporter as { fullName?: string; phone?: string } | null;
          const sub = reporter
            ? [reporter.fullName, reporter.phone].filter(Boolean).join(" · ")
            : (t.bookingCode as string) || undefined;
          return {
            id: String(t.id),
            label: `${t.ticketCode ?? "—"} · ${t.subject ?? ""}`.trim(),
            sub: sub || undefined,
          };
        }),
      ),
};
