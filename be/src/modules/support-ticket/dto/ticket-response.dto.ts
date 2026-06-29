import { SupportTicketEntity } from '../entity/support-ticket.entity';
import { TicketAttachmentEntity } from '../entity/ticket-attachment.entity';
import { TicketMessageEntity } from '../entity/ticket-message.entity';
import { TicketStatusLogEntity } from '../entity/ticket-status-log.entity';
import { TicketResolutionEntity } from '../entity/ticket-resolution.entity';
import { SupportTicketStatus } from 'src/common/enums/support-ticket-status.enum';
import { TicketCategory } from 'src/common/enums/ticket-category.enum';
import { TicketPriority } from 'src/common/enums/ticket-priority.enum';
import { TicketSource } from 'src/common/enums/ticket-source.enum';
import { TicketPendingReason } from 'src/common/enums/ticket-pending-reason.enum';
import { TicketMessageAudience } from 'src/common/enums/ticket-message-audience.enum';
import { UserEntity } from 'src/modules/users/entities/user.entity';

/** Vai trò người gửi message (suy từ user.role; null sender = hệ thống). */
export type MessageSenderRole = 'CUSTOMER' | 'TASKER' | 'ADMIN' | 'SYSTEM';

export function senderRoleOf(sender?: UserEntity | null): MessageSenderRole {
  if (!sender) return 'SYSTEM';
  return sender.role as MessageSenderRole;
}

export interface AttachmentView {
  id: string;
  url: string;
}

export interface TicketSummary {
  id: string;
  ticketCode: string | null;
  subject: string;
  category: TicketCategory;
  subtype: string | null;
  priority: TicketPriority;
  status: SupportTicketStatus;
  source: TicketSource;
  bookingId: string | null;
  bookingCode: string | null;
  slaBreached: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** Số tin nhắn chưa đọc của người xem (badge ngoài ticket). */
  unreadCount?: number;
}

export interface PartyRef {
  id: string;
  fullName: string;
  role: string;
}

export interface PublicMessage {
  id: string;
  senderUserId: string | null;
  senderRole: MessageSenderRole;
  body: string;
  attachments: AttachmentView[];
  createdAt: Date;
}

export interface TicketPublicView extends TicketSummary {
  description: string | null;
  firstRespondedAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  /** Trang tin MỚI NHẤT (cursor pagination — mặc định 30). */
  messages: PublicMessage[];
  /** Còn tin cũ hơn để "tải thêm" không. */
  hasMoreMessages: boolean;
}

/** Một trang tin nhắn (cursor) — dùng cho endpoint "tải tin cũ hơn". */
export interface MessagePage {
  messages: PublicMessage[];
  hasMore: boolean;
}
export interface AdminMessagePage {
  messages: AdminMessage[];
  hasMore: boolean;
}

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

export function toTicketSummary(t: SupportTicketEntity): TicketSummary {
  return {
    id: t.id,
    ticketCode: t.ticketCode ?? null,
    subject: t.subject,
    category: t.category,
    subtype: t.subtype ?? null,
    priority: t.priority,
    status: t.status,
    source: t.source,
    bookingId: t.booking?.id ?? null,
    bookingCode: t.booking?.bookingCode ?? null,
    slaBreached: t.slaBreached,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export interface AdminTicketSummary extends TicketSummary {
  assignedAdmin: PartyRef | null;
  reporter: { id: string; fullName: string; phone: string | null } | null;
}

/** Summary cho hàng đợi admin (kèm admin phụ trách). KHÔNG dùng cho user. */
export function toAdminTicketSummary(
  t: SupportTicketEntity,
): AdminTicketSummary {
  return {
    ...toTicketSummary(t),
    assignedAdmin: t.assignedAdmin
      ? {
          id: t.assignedAdmin.id,
          fullName: t.assignedAdmin.fullName,
          role: t.assignedAdmin.role,
        }
      : null,
    reporter: t.reporter
      ? {
          id: t.reporter.id,
          fullName: t.reporter.fullName,
          phone: t.reporter.phone ?? null,
        }
      : null,
  };
}

function groupAttachmentsByMessage(
  attachments: TicketAttachmentEntity[],
): Map<string, AttachmentView[]> {
  const byMessage = new Map<string, AttachmentView[]>();
  for (const a of attachments) {
    if (!a.message?.id) continue;
    const arr = byMessage.get(a.message.id) ?? [];
    arr.push({ id: a.id, url: a.url });
    byMessage.set(a.message.id, arr);
  }
  return byMessage;
}

/** Map list message entity → PublicMessage[] (lọc INTERNAL — lớp chặn AD7/BR-8). */
export function toPublicMessages(
  messages: TicketMessageEntity[] = [],
  attachments: TicketAttachmentEntity[] = [],
): PublicMessage[] {
  const byMessage = groupAttachmentsByMessage(attachments);
  return messages
    .filter((m) => m.audience !== TicketMessageAudience.INTERNAL)
    .map((m) => ({
      id: m.id,
      senderUserId: m.sender?.id ?? null,
      senderRole: senderRoleOf(m.sender),
      body: m.body,
      attachments: byMessage.get(m.id) ?? [],
      createdAt: m.createdAt,
    }));
}

export function toPublicView(
  t: SupportTicketEntity,
  messages: TicketMessageEntity[] = [],
  attachments: TicketAttachmentEntity[] = [],
  hasMoreMessages = false,
): TicketPublicView {
  return {
    ...toTicketSummary(t),
    description: t.description ?? null,
    firstRespondedAt: t.firstRespondedAt ?? null,
    resolvedAt: t.resolvedAt ?? null,
    closedAt: t.closedAt ?? null,
    messages: toPublicMessages(messages, attachments),
    hasMoreMessages,
  };
}

export interface AdminMessage extends PublicMessage {
  isInternal: boolean;
  audience: TicketMessageAudience;
}

/** 1 dòng ghi chú nội bộ (hiển thị dạng LOG/timeline, không phải bong bóng chat). */
export interface InternalNoteView {
  id: string;
  authorId: string | null;
  authorName: string;
  authorRole: MessageSenderRole;
  body: string;
  createdAt: Date;
}
export interface StatusLogView {
  id: string;
  oldStatus: SupportTicketStatus | null;
  newStatus: SupportTicketStatus;
  changedByUserId: string | null;
  note: string | null;
  createdAt: Date;
}
export interface ResolutionView {
  id: string;
  type: string;
  amount: string | null;
  voucherId: string | null;
  recleanBookingId: string | null;
  proposedByUserId: string | null;
  walletTransactionId: string | null;
  note: string | null;
  createdAt: Date;
}
export interface TicketAdminView extends TicketSummary {
  description: string | null;
  pendingReason: TicketPendingReason | null;
  reporterUserId: string | null;
  counterpartyUserId: string | null;
  assignedAdminId: string | null;
  reporter: PartyRef | null;
  counterparty: PartyRef | null;
  assignedAdmin: PartyRef | null;
  firstResponseDueAt: Date | null;
  resolutionDueAt: Date | null;
  firstRespondedAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  /** Trang tin MỚI NHẤT của các luồng hội thoại (REPORTER+COUNTERPARTY). */
  messages: AdminMessage[];
  /** Phân trang theo từng luồng (tổng số + còn tin cũ hơn). */
  messagePaging: Record<
    'REPORTER' | 'COUNTERPARTY',
    { hasMore: boolean; total: number }
  >;
  statusLogs: StatusLogView[];
  resolutions: ResolutionView[];
  /** Ảnh đính kèm ở cấp ticket (không thuộc message nào). */
  attachments: AttachmentView[];
}

/** Map list message entity → AdminMessage[] (giữ nguyên audience + isInternal). */
export function toAdminMessages(
  messages: TicketMessageEntity[] = [],
  attachments: TicketAttachmentEntity[] = [],
): AdminMessage[] {
  const byMessage = groupAttachmentsByMessage(attachments);
  return messages.map((m) => ({
    id: m.id,
    senderUserId: m.sender?.id ?? null,
    senderRole: senderRoleOf(m.sender),
    body: m.body,
    isInternal: m.isInternal,
    audience: m.audience,
    createdAt: m.createdAt,
    attachments: byMessage.get(m.id) ?? [],
  }));
}

export function toAdminView(
  t: SupportTicketEntity,
  messages: TicketMessageEntity[] = [],
  statusLogs: TicketStatusLogEntity[] = [],
  resolutions: TicketResolutionEntity[] = [],
  attachments: TicketAttachmentEntity[] = [],
  messagePaging: TicketAdminView['messagePaging'] = {
    REPORTER: { hasMore: false, total: 0 },
    COUNTERPARTY: { hasMore: false, total: 0 },
  },
): TicketAdminView {
  const ticketLevel: AttachmentView[] = attachments
    .filter((a) => !a.message?.id)
    .map((a) => ({ id: a.id, url: a.url }));
  return {
    ...toTicketSummary(t),
    description: t.description ?? null,
    pendingReason: t.pendingReason ?? null,
    reporterUserId: t.reporter?.id ?? null,
    counterpartyUserId: t.counterparty?.id ?? null,
    assignedAdminId: t.assignedAdmin?.id ?? null,
    reporter: t.reporter
      ? {
          id: t.reporter.id,
          fullName: t.reporter.fullName,
          role: t.reporter.role,
        }
      : null,
    counterparty: t.counterparty
      ? {
          id: t.counterparty.id,
          fullName: t.counterparty.fullName,
          role: t.counterparty.role,
        }
      : null,
    assignedAdmin: t.assignedAdmin
      ? {
          id: t.assignedAdmin.id,
          fullName: t.assignedAdmin.fullName,
          role: t.assignedAdmin.role,
        }
      : null,
    firstResponseDueAt: t.firstResponseDueAt ?? null,
    resolutionDueAt: t.resolutionDueAt ?? null,
    firstRespondedAt: t.firstRespondedAt ?? null,
    resolvedAt: t.resolvedAt ?? null,
    closedAt: t.closedAt ?? null,
    messages: toAdminMessages(messages, attachments),
    messagePaging,
    attachments: ticketLevel,
    statusLogs: statusLogs.map((l) => ({
      id: l.id,
      oldStatus: l.oldStatus ?? null,
      newStatus: l.newStatus,
      changedByUserId: l.changedBy?.id ?? null,
      note: l.note ?? null,
      createdAt: l.createdAt,
    })),
    resolutions: resolutions.map((r) => ({
      id: r.id,
      type: r.type,
      amount: r.amount ?? null,
      voucherId: r.voucherId ?? null,
      recleanBookingId: r.recleanBookingId ?? null,
      proposedByUserId: r.proposedBy?.id ?? null,
      walletTransactionId: r.walletTransactionId ?? null,
      note: r.note ?? null,
      createdAt: r.createdAt,
    })),
  };
}
