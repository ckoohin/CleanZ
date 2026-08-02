import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import type {
  PaginatedMyTickets,
  MyTicketDetail,
  MyTicketQueryParams,
  CreateTicketDto,
  SendMessageDto,
  SubmitSurveyDto,
  AttachmentUploadResult,
  PublicMessage,
  MarkReadDto,
  MessagePage,
} from "../types/my-ticket.types";

const EP = API_ENDPOINTS.SUPPORT_TICKETS;

export interface MyBookingOption {
  id: string;
  bookingCode: string | null;
  status: string;
  scheduledStart: string | null;
  serviceName: string | null;
  /** Vai của tôi trong đơn — tasker và customer dùng chung một select. */
  myRole: "CUSTOMER" | "TASKER";
}

export const myTicketApi = {
  /**
   * Đơn có thể khiếu nại (select "Đơn liên quan").
   * Dùng endpoint của chính module ticket — hoạt động cho CẢ customer lẫn tasker
   * và đã lọc sẵn đơn quá hạn khiếu nại. Trước đây gọi `/booking/my-bookings`
   * (chỉ mở cho CUSTOMER) nên tasker nhận 403 và không tạo được ticket gắn đơn.
   */
  listMyBookings: (): Promise<MyBookingOption[]> =>
    http
      .get<MyBookingOption[]>(API_ENDPOINTS.SUPPORT_TICKETS.ELIGIBLE_BOOKINGS)
      .then((r) => r.data ?? []),

  /** Tạo ticket khiếu nại từ đơn của tôi */
  create: (dto: CreateTicketDto): Promise<MyTicketDetail> =>
    http.post<MyTicketDetail>(EP.BASE, dto).then((r) => r.data),

  /** Danh sách ticket của tôi (phân trang, lọc) */
  listMine: (params?: MyTicketQueryParams): Promise<PaginatedMyTickets> =>
    http.get<PaginatedMyTickets>(EP.MINE, { params }).then((r) => r.data),

  /** Chi tiết ticket (ẩn ghi chú nội bộ) */
  findOne: (id: string): Promise<MyTicketDetail> =>
    http.get<MyTicketDetail>(EP.DETAIL(id)).then((r) => r.data),

  /** Gửi tin nhắn công khai (trả message đầy đủ: senderRole + attachments) */
  sendMessage: (id: string, dto: SendMessageDto): Promise<PublicMessage> =>
    http.post<PublicMessage>(EP.MESSAGES(id), dto).then((r) => r.data),

  /** Tải trang tin cũ hơn (cursor: before = id tin cũ nhất đang hiển thị) */
  olderMessages: (id: string, before?: string): Promise<MessagePage> =>
    http
      .get<MessagePage>(EP.MESSAGES(id), { params: before ? { before } : {} })
      .then((r) => r.data),

  /** Đánh dấu đã đọc luồng hội thoại của tôi */
  markRead: (id: string, dto: MarkReadDto = {}): Promise<unknown> =>
    http.post(EP.READ(id), dto).then((r) => r.data),

  /** Tổng số tin chưa đọc trên tất cả ticket của tôi (badge nav) */
  unreadTotal: (): Promise<{ count: number }> =>
    http.get<{ count: number }>(EP.UNREAD_TOTAL).then((r) => r.data),

  /** Người gửi mở lại ticket đã đóng (kèm lý do, BE kiểm hạn mở lại) */
  reopen: (id: string, reason: string): Promise<MyTicketDetail> =>
    http.post<MyTicketDetail>(EP.REOPEN(id), { reason }).then((r) => r.data),

  /** Gửi đánh giá hài lòng (CSAT) */
  submitSurvey: (id: string, dto: SubmitSurveyDto): Promise<{ message: string }> =>
    http.post<{ message: string }>(EP.SURVEY(id), dto).then((r) => r.data),

  /** Upload ảnh bằng chứng (multipart/form-data) */
  uploadAttachment: (id: string, file: File): Promise<AttachmentUploadResult> => {
    const formData = new FormData();
    formData.append("file", file);
    return http
      .post<AttachmentUploadResult>(EP.ATTACHMENTS(id), formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
};
