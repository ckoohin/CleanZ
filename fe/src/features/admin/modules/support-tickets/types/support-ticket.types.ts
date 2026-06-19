// ─── Enums ──────────────────────────────────────────────────────────────────
export type TicketStatus =
  | "OPEN"
  | "PENDING_CUSTOMER"
  | "PENDING_ADMIN"
  | "IN_PROGRESS"
  | "ESCALATED"
  | "RESOLVED"
  | "CLOSED"
  | "CANCELLED";

export type TicketCategory =
  | "BOOKING_ISSUE"
  | "PAYMENT_ISSUE"
  | "TASKER_BEHAVIOR"
  | "SERVICE_QUALITY"
  | "APP_BUG"
  | "ACCOUNT_ISSUE"
  | "OTHER";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketSource = "APP" | "HOTLINE" | "EMAIL" | "CHAT" | "ADMIN";
export type TicketPendingReason = "WAITING_CUSTOMER" | "WAITING_THIRD_PARTY" | "WAITING_INTERNAL";
export type ResolutionType =
  | "REFUND"
  | "COMPENSATION"
  | "TASKER_PENALTY"
  | "RECLEAN"
  | "VOUCHER"
  | "NO_ACTION"
  | "EXPLANATION";

// ─── Base ───────────────────────────────────────────────────────────────────
export interface TicketSummary {
  id: string;
  ticketCode: string | null;
  subject: string;
  category: TicketCategory;
  subtype: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  source: TicketSource;
  bookingId: string | null;
  slaBreached: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Admin Detail View ───────────────────────────────────────────────────────
export interface AdminMessage {
  id: string;
  senderUserId: string | null;
  body: string;
  isInternal: boolean;
  createdAt: string;
}

export interface StatusLogView {
  id: string;
  oldStatus: TicketStatus | null;
  newStatus: TicketStatus;
  changedByUserId: string | null;
  note: string | null;
  createdAt: string;
}

export interface ResolutionView {
  id: string;
  type: ResolutionType;
  amount: string | null;
  voucherId: string | null;
  recleanBookingId: string | null;
  proposedByUserId: string | null;
  walletTransactionId: string | null;
  note: string | null;
  createdAt: string;
}

export interface TicketAdminDetail extends TicketSummary {
  description: string | null;
  pendingReason: TicketPendingReason | null;
  reporterUserId: string | null;
  counterpartyUserId: string | null;
  assignedAdminId: string | null;
  firstResponseDueAt: string | null;
  resolutionDueAt: string | null;
  firstRespondedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  messages: AdminMessage[];
  statusLogs: StatusLogView[];
  resolutions: ResolutionView[];
}

// ─── Pagination ──────────────────────────────────────────────────────────────
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedTickets {
  data: TicketSummary[];
  meta: PaginationMeta;
}

// ─── Config ──────────────────────────────────────────────────────────────────
export interface SlaEntry {
  responseMins: number;
  resolutionMins: number;
}

export interface TicketConfig {
  slaMatrix: Record<string, SlaEntry>;
  categoryPriority: Record<string, TicketPriority>;
  autoCloseHours: number;
  complaintWindowDays: number;
}

// ─── Query Params ─────────────────────────────────────────────────────────────
export interface AdminTicketQueryParams {
  page?: number;
  limit?: number;
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  reporterUserId?: string;
  assignedAdminId?: string;
  slaBreached?: boolean;
  bookingId?: string;
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────
export interface CreateTicketOnBehalfDto {
  reporterUserId: string;
  subject: string;
  description?: string;
  category: TicketCategory;
  bookingId?: string;
}

export interface ChangeStatusDto {
  status: TicketStatus;
  pendingReason?: TicketPendingReason;
  note?: string;
}

export interface AssignTicketDto {
  adminId: string | null;
}

export interface CreateAdminMessageDto {
  body: string;
  attachmentIds?: string[];
  isInternal?: boolean;
}

export interface CreateResolutionDto {
  type: ResolutionType;
  amount?: number;
  voucherId?: string;
  recleanBookingId?: string;
  note?: string;
}

export interface ReclassifyTicketDto {
  category: TicketCategory;
  subtype?: string;
}

export interface UpdateTicketConfigDto {
  slaMatrix?: Record<string, { responseMins: number; resolutionMins: number }>;
  categoryPriority?: Record<string, string>;
  autoCloseHours?: number;
  complaintWindowDays?: number;
}
