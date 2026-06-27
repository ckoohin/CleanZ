
export type {
  TicketStatus,
  TicketCategory,
  TicketPriority,
  TicketSource,
  PendingReason,
  ResolutionType,
} from "@/features/support-tickets/shared/ticket.enums";

export type {
  TicketSummary,
  TicketAdminView,
  AdminMessage,
  StatusLog,
  Resolution,
  PartyRef,
  Attachment,
  TicketConfig,
  SlaEntry,
  PaginationMeta,
  TicketAudience,
  MarkReadAdminInput,
  InternalNote,
} from "@/features/support-tickets/shared/ticket.types";

import type {
  Paginated,
  TicketSummary,
  TicketAdminView,
  AdminTicketQuery,
  CreateTicketAdminInput,
  ChangeStatusInput,
  AssignTicketInput,
  AdminMessageInput,
  CreateResolutionInput,
  ReclassifyInput,
  UpdateTicketConfigInput,
} from "@/features/support-tickets/shared/ticket.types";
import type { PendingReason } from "@/features/support-tickets/shared/ticket.enums";

export type PaginatedTickets = Paginated<TicketSummary>;
export type TicketAdminDetail = TicketAdminView;
export type AdminTicketQueryParams = AdminTicketQuery;
export type CreateTicketOnBehalfDto = CreateTicketAdminInput;
export type ChangeStatusDto = ChangeStatusInput;
export type AssignTicketDto = AssignTicketInput;
export type CreateAdminMessageDto = AdminMessageInput;
export type CreateResolutionDto = CreateResolutionInput;
export type ReclassifyTicketDto = ReclassifyInput;
export type UpdateTicketConfigDto = UpdateTicketConfigInput;
export type TicketPendingReason = PendingReason;
