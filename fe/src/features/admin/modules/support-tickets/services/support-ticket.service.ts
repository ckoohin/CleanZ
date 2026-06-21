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
} from "../types/support-ticket.types";

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

  // ── Gửi tin nhắn (public / internal note) — BE trả Message (spec §2.6) ────
  addMessage: (id: string, dto: CreateAdminMessageDto): Promise<AdminMessage> =>
    http.post<AdminMessage>(EP.MESSAGES(id), dto).then((r) => r.data),

  // ── Ghi nhận kết luận xử lý — BE trả Resolution (spec §2.7) ──────────────
  addResolution: (id: string, dto: CreateResolutionDto): Promise<Resolution> =>
    http.post<Resolution>(EP.RESOLUTIONS(id), dto).then((r) => r.data),

  // ── Phân loại lại ticket ─────────────────────────────────────────────────
  reclassify: (id: string, dto: ReclassifyTicketDto): Promise<TicketAdminDetail> =>
    http.patch<TicketAdminDetail>(EP.CATEGORY(id), dto).then((r) => r.data),
};
