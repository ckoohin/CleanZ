export interface AdminReviewItem {
  id: string;
  bookingId: string;
  customerId: string;
  taskerId: string;
  packageId: string | null;
  overallRating: number;
  punctuality: number;
  cleanliness: number;
  friendliness: number;
  satisfaction: number;
  comment: string | null;
  images: string[];
  isAnonymous: boolean;
  isHidden: boolean;
  adminReply: string | null;
  taskerReply: string | null;
  reportCount: number;
  createdAt: string;
  customerName: string | null;
  customerAvatar: string | null;
  taskerName: string | null;
  bookingCode: string | null;
}

export interface AdminReviewListResponse {
  items: AdminReviewItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminReviewQuery {
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
  minRating?: number;
  maxRating?: number;
  isHidden?: boolean;
  taskerId?: string;
  reportStatus?: "PENDING" | "APPROVED" | "REJECTED";
}

export interface AdminReviewDashboard {
  summary: {
    avgRating: number;
    total: number;
    nps: number;
    criteria: {
      punctuality: number;
      cleanliness: number;
      friendliness: number;
      satisfaction: number;
    };
  };
  distribution: { stars: number; count: number; pct: number }[];
  trend: { date: string; count: number; avg: number }[];
  pendingReports: number;
}

export interface AdminReportItem {
  id: string;
  reviewId: string;
  reportedBy: string;
  reason: string;
  description: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  reporterName: string | null;
  reviewRating: number | null;
  reviewComment: string | null;
  reviewHidden: boolean | null;
}

export interface AdminReportsResponse {
  items: AdminReportItem[];
  total: number;
  page: number;
  limit: number;
}
