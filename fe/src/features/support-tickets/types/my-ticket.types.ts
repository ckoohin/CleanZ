import type {
  PendingReason,
  ResolutionType,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@/features/support-tickets/shared/ticket.enums";

export type {
  PendingReason,
  ResolutionType,
  TicketCategory,
  TicketPriority,
  TicketStatus,
};

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
  /** Số tin nhắn chưa đọc — badge ngoài ticket. */
  unreadCount?: number;
  /**
   * Vai của TÔI trong ticket: `REPORTER` = tôi gửi khiếu nại này,
   * `COUNTERPARTY` = khiếu nại nhắm vào tôi (cần tôi phản hồi/giải trình).
   */
  myRole?: "REPORTER" | "COUNTERPARTY";
  /** Lý do tạm chờ — chỉ có nghĩa khi `status === "PENDING"`. */
  pendingReason?: PendingReason | null;
  /**
   * Ticket đang chờ CHÍNH TÔI phản hồi. BE tính bằng đúng biểu thức quyết định
   * auto-resume, nên đừng tự suy lại ở FE (sẽ lệch hành vi thật).
   */
  awaitingMe?: boolean;
}

export type MessageSenderRole = "CUSTOMER" | "TASKER" | "ADMIN" | "SYSTEM";

export interface TicketAttachment {
  id: string;
  url: string;
}

export interface PublicMessage {
  id: string;
  senderUserId: string | null;
  senderRole: MessageSenderRole;
  body: string;
  attachments: TicketAttachment[];
  createdAt: string;
  /** Đánh dấu tin đang gửi (optimistic, chưa có id thật từ server). */
  pending?: boolean;
}

export type TicketAudience = "REPORTER" | "COUNTERPARTY" | "INTERNAL";

export interface TicketMessageEvent {
  ticketId: string;
  audience: TicketAudience;
  message: PublicMessage;
}

export interface TicketTypingEvent {
  ticketId: string;
  audience: TicketAudience;
  fromUserId: string;
  fromRole: string;
}

export interface TicketReadEvent {
  ticketId: string;
  audience: TicketAudience;
  byUserId: string;
  lastReadMessageId: string | null;
  readAt: string;
}

export interface MyTicketDetail extends MyTicketSummary {
  description: string | null;
  firstRespondedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  /** Trang tin mới nhất (cursor pagination). */
  messages: PublicMessage[];
  /** Còn tin cũ hơn để "tải thêm". */
  hasMoreMessages?: boolean;
  /** Kết luận xử lý admin đã ghi cho vụ việc này (bản rút gọn, an toàn). */
  resolutions?: PublicResolution[];
  /** Hạn xử lý cam kết. */
  resolutionDueAt?: string | null;
  /** BE cho phép bấm "Mở lại" không (đã tính cả vai lẫn hạn mở lại). */
  canReopen?: boolean;
  /** Hạn chót còn mở lại được. */
  reopenDeadline?: string | null;
}

/** Kết luận xử lý — bản khách/tasker được xem. */
export interface PublicResolution {
  id: string;
  type: ResolutionType;
  amount: string | null;
  note: string | null;
  createdAt: string;
}

/** 1 trang tin nhắn (cursor) khi tải tin cũ hơn. */
export interface MessagePage {
  messages: PublicMessage[];
  hasMore: boolean;
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
  body?: string;
  attachmentIds?: string[];
}

export interface MarkReadDto {
  lastMessageId?: string;
}

export interface SubmitSurveyDto {
  rating: number;
  comment?: string;
}
