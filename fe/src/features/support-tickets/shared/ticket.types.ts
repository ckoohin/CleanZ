import type {
  PendingReason,
  ResolutionType,
  TicketCategory,
  TicketPriority,
  TicketSource,
  TicketStatus,
} from './ticket.enums';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface Attachment {
  id: string;
  url: string;
  uploadedByRole?: string | null;
  createdAt?: string;
}
export interface PublicMessage {
  id: string;
  senderRole: string;
  body: string;
  attachments: Attachment[];
  createdAt: string;
}
export interface AdminMessage {
  id: string;
  senderUserId: string | null;
  senderRole: string;
  body: string;
  isInternal: boolean;
  attachments: Attachment[];
  createdAt: string;
}
export interface StatusLog {
  id: string;
  oldStatus: TicketStatus | null;
  newStatus: TicketStatus;
  changedByUserId: string | null;
  note: string | null;
  createdAt: string;
}
export interface Resolution {
  id: string;
  type: ResolutionType;
  amount: string | null;
  note: string | null;
  proposedByUserId: string;
  walletTransactionId: string | null;
  createdAt: string;
}
export interface PartyRef {
  id: string;
  role: string;
  fullName: string;
}

export interface TicketSummary {
  id: string;
  ticketCode: string | null;
  subject: string;
  category: TicketCategory;
  subtype: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  bookingCode: string | null;
  slaBreached: boolean;
  createdAt: string;
  updatedAt: string;
  /** Admin phụ trách (chỉ có ở hàng đợi admin). */
  assignedAdmin?: PartyRef | null;
}

export interface TicketPublicView extends TicketSummary {
  description: string;
  source: TicketSource;
  counterpartyRole: string | null;
  resolutionSummary: string | null;
  messages: PublicMessage[];
  attachments: Attachment[];
  firstRespondedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
}

export interface TicketAdminView extends TicketPublicView {
  reporter: PartyRef;
  counterparty: PartyRef | null;
  assignedAdmin: PartyRef | null;
  pendingReason: PendingReason | null;
  firstResponseDueAt: string | null;
  resolutionDueAt: string | null;
  messages: AdminMessage[];
  statusLogs: StatusLog[];
  resolutions: Resolution[];
}

export interface CreateTicketInput {
  bookingId?: string;
  category: TicketCategory;
  subtype?: string;
  subject: string;
  description: string;
  priority?: TicketPriority;
  attachmentIds?: string[];
}
export interface CreateTicketAdminInput extends CreateTicketInput {
  reporterUserId: string;
  assignToSelf?: boolean;
}
export interface SendMessageInput {
  body: string;
  attachmentIds?: string[];
}
export interface AdminMessageInput extends SendMessageInput {
  isInternal?: boolean;
}
export interface ChangeStatusInput {
  status: TicketStatus;
  pendingReason?: PendingReason;
  note?: string;
}
export interface AssignTicketInput {
  assignedAdminId?: string;
}
export interface CreateResolutionInput {
  type: ResolutionType;
  amount?: number;
  voucherId?: string;
  recleanBookingId?: string;
  note?: string;
}
export interface ReclassifyInput {
  category: TicketCategory;
  subtype?: string;
  priority?: TicketPriority;
}
export interface SubmitSurveyInput {
  /** 1–5 */
  rating: number;
  comment?: string;
}

export interface UserTicketQuery {
  page?: number;
  limit?: number;
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  role?: 'reporter' | 'counterparty';
}
export interface AdminTicketQuery {
  page?: number;
  limit?: number;
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  reporterUserId?: string;
  assignedAdminId?: string;
  slaBreached?: boolean;
  bookingId?: string;
  keyword?: string;
  sort?: 'priority' | 'createdAt' | 'dueAt';
}

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
export interface UpdateTicketConfigInput {
  slaMatrix?: Record<string, SlaEntry>;
  categoryPriority?: Record<string, string>;
  autoCloseHours?: number;
  complaintWindowDays?: number;
}
