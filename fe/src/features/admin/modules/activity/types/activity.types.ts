export type AdminActivityStatus = "SUCCESS" | "WARNING" | "DANGER";

/**
 * Mức RỦI RO của hành động — khác với `AdminActivityStatus` là mức THÀNH CÔNG.
 * Một thao tác `CRITICAL` thất bại vẫn đáng chú ý hơn trăm thao tác `NORMAL` trót lọt.
 */
export type AuditSeverity = "CRITICAL" | "HIGH" | "NORMAL" | "READ_SENSITIVE";

export interface AdminActivityItem {
  id: string;
  actor: string;
  actorEmail: string;
  role: "ADMIN";
  /** Nhãn hiển thị tiếng Việt, ghép ở backend. Không dùng làm khoá lọc. */
  action: string;
  /** Khoá nghiệp vụ ổn định, ví dụ `FINANCE.WALLET_MANUAL_ADJUSTMENT`. */
  actionCode: string;
  severity: AuditSeverity;
  /** Lý do admin nhập. Chỉ nhóm nghiệp vụ trọng yếu mới yêu cầu. */
  reason: string | null;
  /** Nối thao tác này với mọi thay đổi dữ liệu nó gây ra ở bảng khác. */
  correlationId: string | null;
  resource: string;
  targetLabel: string | null;
  targetType: string | null;
  /** Số bản ghi bị tác động với thao tác hàng loạt. */
  affectedCount: number | null;
  /** Số liệu nghiệp vụ có cấu trúc (số tiền, số dư trước/sau…). */
  businessData: Record<string, unknown> | null;
  changes: Record<string, unknown> | null;
  status: AdminActivityStatus;
  errorMessage: string | null;
  timestamp: string;
}

export interface AdminActivityQuery {
  page?: number;
  limit?: number;
  status?: AdminActivityStatus;
  severity?: AuditSeverity;
  actionCode?: string;
  /** Gom mọi thao tác thuộc cùng một request admin. */
  correlationId?: string;
  keyword?: string;
  from?: string;
  to?: string;
}

/**
 * Số liệu để quyết định khi nào cần đổi kiến trúc lưu trữ nhật ký.
 * `averageBytesPerLog` chỉ đáng tin khi bảng đã có vài nghìn dòng — dưới mức đó,
 * chi phí cố định của index và trang trống át số liệu thật.
 */
export interface AuditStorageMetrics {
  totalLogs: number;
  logsLast24h: number;
  logsPerDayLast30d: number;
  averageBytesPerLog: number;
  tableSizeBytes: number;
  oldestLogAt: string | null;
  outboxPending: number;
  outboxFailed: number;
  outboxOldestPendingAt: string | null;
}

export interface AdminActivityResponse {
  data: AdminActivityItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: {
    total: number;
    success: number;
    warning: number;
    danger: number;
  };
}
