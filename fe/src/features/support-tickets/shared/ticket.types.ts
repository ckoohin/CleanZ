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
export type TicketAudience = 'REPORTER' | 'COUNTERPARTY' | 'INTERNAL';

export interface AdminMessage {
  id: string;
  senderUserId: string | null;
  senderRole: string;
  body: string;
  isInternal: boolean;
  audience: TicketAudience;
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

/** 1 dòng ghi chú nội bộ (hiển thị dạng log/timeline, ngoài luồng chat). */
export interface InternalNote {
  id: string;
  authorId: string | null;
  authorName: string;
  authorRole: string;
  body: string;
  createdAt: string;
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
  /** Số tin nhắn chưa đọc — badge ngoài ticket. */
  unreadCount?: number;
  /** Hạn xử lý (hàng đợi admin) — để thấy ticket SẮP trễ, không chỉ ĐÃ trễ. */
  resolutionDueAt?: string | null;
  /** Vi phạm hạn phản hồi lần đầu (hàng đợi admin). */
  firstResponseBreached?: boolean;
}

export interface TicketPublicView extends TicketSummary {
  description: string;
  source: TicketSource;
  counterpartyRole: string | null;
  resolutionSummary: string | null;
  messages: PublicMessage[];
  /** Còn tin cũ hơn trang hiện tại để "tải thêm". */
  hasMoreMessages?: boolean;
  attachments: Attachment[];
  firstRespondedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
}

/** 1 trang tin nhắn trả về khi "tải tin cũ hơn". */
export interface MessagePage {
  messages: PublicMessage[];
  hasMore: boolean;
}
export interface AdminMessagePage {
  messages: AdminMessage[];
  hasMore: boolean;
}

export interface TicketAdminView extends TicketPublicView {
  reporter: PartyRef;
  counterparty: PartyRef | null;
  assignedAdmin: PartyRef | null;
  pendingReason: PendingReason | null;
  firstResponseDueAt: string | null;
  resolutionDueAt: string | null;
  /** Quá hạn PHẢN HỒI LẦN ĐẦU — khác `slaBreached` (quá hạn xử lý). */
  firstResponseBreached?: boolean;
  messages: AdminMessage[];
  /** Phân trang theo từng luồng hội thoại. */
  messagePaging?: Record<
    "REPORTER" | "COUNTERPARTY",
    { hasMore: boolean; total: number }
  >;
  statusLogs: StatusLog[];
  resolutions: Resolution[];
  /** Kết quả CSAT (null nếu chưa mời hoặc khách chưa chấm). */
  survey?: {
    rating: number | null;
    comment: string | null;
    submittedAt: string | null;
  } | null;
}

/** Thống kê vận hành cho dashboard admin (GET /admin/support-tickets/stats). */
export interface TicketStats {
  range: { from: string; to: string };
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  sla: {
    resolutionBreached: number;
    firstResponseBreached: number;
    resolutionComplianceRate: number;
    firstResponseComplianceRate: number;
  };
  handling: {
    resolvedCount: number;
    avgFirstResponseMins: number | null;
    avgResolutionMins: number | null;
  };
  csat: {
    invited: number;
    responses: number;
    avgRating: number | null;
    distribution: Record<string, number>;
  };
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
  body?: string;
  attachmentIds?: string[];
}
export interface AdminMessageInput extends SendMessageInput {
  isInternal?: boolean;
  targetAudience?: TicketAudience;
}
export interface MarkReadAdminInput {
  audience: TicketAudience;
  lastMessageId?: string;
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
  /** Kỳ lọc theo ngày TẠO ticket, dạng 'YYYY-MM-DD' (biên tính theo giờ VN ở BE). */
  fromDate?: string;
  toDate?: string;
}

/** Bộ lọc khi xuất danh sách: y hệt hàng đợi nhưng không có phân trang. */
export type AdminTicketExportQuery = Omit<AdminTicketQuery, 'page' | 'limit'>;

/** Kỳ lọc theo ngày — dùng chung cho hàng đợi, dải chỉ số và cả hai file xuất ra. */
export type TicketDateRangeQuery = Pick<
  AdminTicketQuery,
  'fromDate' | 'toDate'
>;

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
