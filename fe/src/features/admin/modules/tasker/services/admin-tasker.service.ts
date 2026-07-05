import http from "@/lib/api/http";
import type {
  AdminCreditWalletPayload,
  AdminTasker,
  AdminTaskerDetail,
  AdminTaskerFilter,
  AdminUpdateTaskerPayload,
  UpdateTaskerWorkStatusPayload,
  AdminWalletResult,
  AdminWalletTransactionList,
  BanType,
  PaginatedTaskers,
} from "../types/admin-tasker.types";

const BASE = "/tasker/admin";

export interface TaskerDocumentItem {
  id: string;
  type: string;
  fileUrl: string | null;
}

export interface TaskerDocumentsResponse {
  documents: TaskerDocumentItem[];
}

const buildDocumentsFromDetail = (
  detail: AdminTaskerDetail
): TaskerDocumentsResponse => {
  const doc = detail.document;
  const documents: TaskerDocumentItem[] = [
    { id: "citizenCard-front", type: "citizenCard", fileUrl: doc.frontUrl },
    { id: "citizenCard-back", type: "citizenCard", fileUrl: doc.backUrl },
    { id: "idWithSelfie", type: "idWithSelfie", fileUrl: detail.avatarUrl },
    { id: "criminalRecord", type: "criminalRecord", fileUrl: doc.criminalRecordUrl },
    { id: "healthCertificate", type: "healthCertificate", fileUrl: doc.healthCertificateUrl },
    { id: "certificate", type: "certificate", fileUrl: doc.certificateUrl },
  ];
  return { documents: documents.filter((d) => d.fileUrl) };
};

export const adminTaskerApi = {
  getTaskers: (params: AdminTaskerFilter): Promise<PaginatedTaskers> =>
    http.get(BASE, { params }).then((res) => res.data),

  getTaskerDetail: (id: string): Promise<AdminTaskerDetail> =>
    http.get(`${BASE}/${id}`).then((res) => res.data),

  // Admin chỉnh sửa thông tin cơ bản của tasker (không đụng tới giấy tờ KYC).
  updateTasker: (
    id: string,
    payload: AdminUpdateTaskerPayload
  ): Promise<AdminTasker> =>
    http.patch(`${BASE}/${id}`, payload).then((res) => res.data),

  updateTaskerWorkStatus: ({
    id,
    clearCancelSuspension,
  }: UpdateTaskerWorkStatusPayload): Promise<AdminTasker> =>
    http
      .patch(`${BASE}/${id}/work-status`, {
        ...(clearCancelSuspension ? { clearCancelSuspension } : {}),
      })
      .then((res) => res.data),

  getTaskerDocuments: (id: string): Promise<TaskerDocumentsResponse> =>
    http.get(`${BASE}/${id}`).then((res) => buildDocumentsFromDetail(res.data)),

  approveTasker: (id: string): Promise<AdminTasker> =>
    http.patch(`${BASE}/${id}/approve`).then((res) => res.data),

  rejectTasker: (id: string, notes: string): Promise<AdminTasker> =>
    http.patch(`${BASE}/${id}/reject`, { notes }).then((res) => res.data),

  requestMoreInfo: (id: string, notes: string): Promise<AdminTasker> =>
    http.patch(`${BASE}/${id}/request-info`, { notes }).then((res) => res.data),

  deleteTaskerProfile: (id: string): Promise<{ id: string; deleted: boolean }> =>
    http.delete(`${BASE}/${id}`).then((res) => res.data),

  banTasker: (
    id: string,
    reason: string,
    type: BanType,
    durationDays?: number
  ): Promise<AdminTasker> =>
    http
      .post(`${BASE}/${id}/ban`, {
        reason,
        type,
        // Chỉ gửi durationDays cho hình thức TEMPORARY; PERMANENT bỏ qua.
        ...(type === "TEMPORARY" && durationDays ? { durationDays } : {}),
      })
      .then((res) => res.data),

  unbanTasker: (id: string): Promise<AdminTasker> =>
    http.post(`${BASE}/${id}/unban`).then((res) => res.data),

  // Khôi phục tasker bị chấm dứt vĩnh viễn (TERMINATED) sau kháng cáo hợp lý.
  reinstateTasker: (id: string, reason?: string): Promise<AdminTasker> =>
    http
      .patch(`${BASE}/${id}/reinstate`, reason ? { reason } : {})
      .then((res) => res.data),

  getTaskerPenalties: (id: string): Promise<unknown[]> =>
    http.get(`${BASE}/${id}/penalties`).then((res) => res.data?.data ?? []),

  // Admin ghi nhận tasker nộp tiền mặt tại trụ sở → cộng thẳng vào ví.
  // Endpoint ở module wallet, không phải BASE (/tasker/admin).
  creditTaskerWallet: (
    taskerId: string,
    payload: AdminCreditWalletPayload
  ): Promise<AdminWalletResult> =>
    http
      .post(`/wallet/admin/tasker/${taskerId}/credit`, payload)
      .then((res) => res.data.data),

  // Lịch sử giao dịch ví của tasker (tối đa 50 bút toán gần nhất).
  getTaskerWalletTransactions: (
    taskerId: string
  ): Promise<AdminWalletTransactionList> =>
    http
      .get(`/wallet/admin/tasker/${taskerId}/transactions`)
      .then((res) => res.data),
};
