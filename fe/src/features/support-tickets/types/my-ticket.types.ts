import type {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@/features/admin/modules/support-tickets/types/support-ticket.types";

// Re-export shared types
export type { TicketCategory, TicketPriority, TicketStatus };

// ─── Response Shapes ─────────────────────────────────────────────────────────
export interface MyTicketSummary {
  id: string;
  ticketCode: string | null;
  subject: string;
  category: TicketCategory;
  subtype: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  source: string;
  bookingId: string | null;
  slaBreached: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicMessage {
  id: string;
  senderUserId: string | null;
  body: string;
  createdAt: string;
}

export interface MyTicketDetail extends MyTicketSummary {
  description: string | null;
  firstRespondedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  messages: PublicMessage[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedMyTickets {
  data: MyTicketSummary[];
  meta: PaginationMeta;
}

export interface AttachmentUploadResult {
  id: string;
  url: string;
  filename: string;
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────
export interface CreateTicketDto {
  bookingId?: string;
  category: TicketCategory;
  subtype?: string;
  subject: string;
  description: string;
  priority?: TicketPriority;
  attachmentIds?: string[];
}

export interface MyTicketQueryParams {
  page?: number;
  limit?: number;
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  role?: "reporter" | "counterparty";
}

export interface SendMessageDto {
  body: string;
  attachmentIds?: string[];
}

export interface SubmitSurveyDto {
  /** 1–5 */
  rating: number;
  comment?: string;
}
