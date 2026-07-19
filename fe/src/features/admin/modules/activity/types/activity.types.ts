export type AdminActivityStatus = "SUCCESS" | "WARNING" | "DANGER";

export interface AdminActivityItem {
  id: string;
  actor: string;
  actorEmail: string;
  role: "ADMIN";
  action: string;
  resource: string;
  targetLabel: string | null;
  changes: Record<string, unknown> | null;
  status: AdminActivityStatus;
  errorMessage: string | null;
  timestamp: string;
}

export interface AdminActivityQuery {
  page?: number;
  limit?: number;
  status?: AdminActivityStatus;
  keyword?: string;
  from?: string;
  to?: string;
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
