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
} from "../types/my-ticket.types";

const EP = API_ENDPOINTS.SUPPORT_TICKETS;

export interface MyBookingOption {
  id: string;
  bookingCode: string;
  status: string;
  scheduledStart: string | null;
  serviceName: string | null;
}

export const myTicketApi = {
  /** Booking của khách (cho select khi tạo ticket). */
  listMyBookings: (): Promise<MyBookingOption[]> =>
    http.get<MyBookingOption[]>(API_ENDPOINTS.BOOKING.MY_LIST).then((r) => r.data),

  /** Tạo ticket khiếu nại từ đơn của tôi */
  create: (dto: CreateTicketDto): Promise<MyTicketDetail> =>
    http.post<MyTicketDetail>(EP.BASE, dto).then((r) => r.data),

  /** Danh sách ticket của tôi (phân trang, lọc) */
  listMine: (params?: MyTicketQueryParams): Promise<PaginatedMyTickets> =>
    http.get<PaginatedMyTickets>(EP.MINE, { params }).then((r) => r.data),

  /** Chi tiết ticket (ẩn ghi chú nội bộ) */
  findOne: (id: string): Promise<MyTicketDetail> =>
    http.get<MyTicketDetail>(EP.DETAIL(id)).then((r) => r.data),

  /** Gửi tin nhắn công khai */
  sendMessage: (id: string, dto: SendMessageDto): Promise<{ id: string }> =>
    http.post<{ id: string }>(EP.MESSAGES(id), dto).then((r) => r.data),

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
