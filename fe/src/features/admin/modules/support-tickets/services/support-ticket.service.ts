import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import type {
  PaginatedTickets,
  TicketAdminDetail,
  TicketConfig,
  AdminTicketQueryParams,
  CreateTicketOnBehalfDto,
  ChangeStatusDto,
  AssignTicketDto,
  CreateAdminMessageDto,
  CreateResolutionDto,
  ReclassifyTicketDto,
  UpdateTicketConfigDto,
  AdminMessage,
  Resolution,
  MarkReadAdminInput,
  InternalNote,
  TicketAudience,
} from "../types/support-ticket.types";
import type {
  AdminMessagePage,
  TicketStats,
} from "@/features/support-tickets/shared/ticket.types";

const EP = API_ENDPOINTS.ADMIN_SUPPORT_TICKETS;

export const supportTicketAdminApi = {
  // ── Config ─────────────────────────────────────────────────────────────────
  getConfig: (): Promise<TicketConfig> =>
    http.get<TicketConfig>(EP.CONFIG).then((r) => r.data),

  updateConfig: (dto: UpdateTicketConfigDto): Promise<TicketConfig> =>
    http.put<TicketConfig>(EP.CONFIG, dto).then((r) => r.data),

  // ── Ticket List ────────────────────────────────────────────────────────────
  list: (params?: AdminTicketQueryParams): Promise<PaginatedTickets> =>
    http.get<PaginatedTickets>(EP.BASE, { params }).then((r) => r.data),

  // ── Thống kê vận hành (SLA / thời gian xử lý / CSAT) ─────────────────────
  getStats: (params?: { from?: string; to?: string }): Promise<TicketStats> =>
    http.get<TicketStats>(EP.STATS, { params }).then((r) => r.data),

  // ── Gán hàng loạt từ hàng đợi ────────────────────────────────────────────
  bulkAssign: (
    ticketIds: string[],
    assignedAdminId?: string,
  ): Promise<{ assigned: number; skipped: string[] }> =>
    http
      .patch<{ assigned: number; skipped: string[] }>(EP.BULK_ASSIGN, {
        ticketIds,
        ...(assignedAdminId ? { assignedAdminId } : {}),
      })
      .then((r) => r.data),

  // ── Tổng tin chưa đọc (badge) ────────────────────────────────────────────
  unreadTotal: (): Promise<{ count: number }> =>
    http.get<{ count: number }>(EP.UNREAD_TOTAL).then((r) => r.data),

  // ── Tạo ticket hộ (hotline) ───────────────────────────────────────────────
  createOnBehalf: (dto: CreateTicketOnBehalfDto): Promise<TicketAdminDetail> =>
    http.post<TicketAdminDetail>(EP.BASE, dto).then((r) => r.data),

  // ── Ticket Detail ──────────────────────────────────────────────────────────
  findOne: (id: string): Promise<TicketAdminDetail> =>
    http.get<TicketAdminDetail>(EP.DETAIL(id)).then((r) => r.data),

  // ── Gán admin xử lý ──────────────────────────────────────────────────────
  assign: (id: string, dto: AssignTicketDto): Promise<TicketAdminDetail> =>
    http.patch<TicketAdminDetail>(EP.ASSIGN(id), dto).then((r) => r.data),

  // ── Đổi trạng thái (state machine) ───────────────────────────────────────
  changeStatus: (id: string, dto: ChangeStatusDto): Promise<TicketAdminDetail> =>
    http.patch<TicketAdminDetail>(EP.STATUS(id), dto).then((r) => r.data),

  // ── Upload ảnh (admin) → trả {id,url} để gắn vào reply ───────────────────
  uploadAttachment: (id: string, file: File): Promise<{ id: string; url: string }> => {
    const fd = new FormData();
    fd.append("file", file);
    return http
      .post<{ id: string; url: string }>(EP.ATTACHMENTS(id), fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  // ── Gửi tin nhắn (public / internal note) — BE trả Message (spec §2.6) ────
  addMessage: (id: string, dto: CreateAdminMessageDto): Promise<AdminMessage> =>
    http.post<AdminMessage>(EP.MESSAGES(id), dto).then((r) => r.data),

  // ── Ghi chú nội bộ (log) — tách khỏi luồng chat ──────────────────────────
  listInternalNotes: (id: string): Promise<InternalNote[]> =>
    http.get<InternalNote[]>(EP.INTERNAL_NOTES(id)).then((r) => r.data),

  addInternalNote: (id: string, body: string): Promise<InternalNote> =>
    http
      .post<InternalNote>(EP.INTERNAL_NOTES(id), { body })
      .then((r) => r.data),

  // ── Tải trang tin cũ hơn 1 luồng (cursor) ────────────────────────────────
  olderMessages: (
    id: string,
    audience: TicketAudience,
    before?: string,
  ): Promise<AdminMessagePage> =>
    http
      .get<AdminMessagePage>(EP.MESSAGES(id), {
        params: { audience, ...(before ? { before } : {}) },
      })
      .then((r) => r.data),

  // ── Đánh dấu đã đọc 1 luồng (REPORTER/COUNTERPARTY/INTERNAL) ─────────────
  markRead: (id: string, dto: MarkReadAdminInput): Promise<unknown> =>
    http.post(EP.READ(id), dto).then((r) => r.data),

  // ── Ghi nhận kết luận xử lý — BE trả Resolution (spec §2.7) ──────────────
  addResolution: (id: string, dto: CreateResolutionDto): Promise<Resolution> =>
    http.post<Resolution>(EP.RESOLUTIONS(id), dto).then((r) => r.data),

  // ── Phân loại lại ticket ─────────────────────────────────────────────────
  reclassify: (id: string, dto: ReclassifyTicketDto): Promise<TicketAdminDetail> =>
    http.patch<TicketAdminDetail>(EP.CATEGORY(id), dto).then((r) => r.data),
};
