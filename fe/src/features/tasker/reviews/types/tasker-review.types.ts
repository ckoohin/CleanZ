export interface TaskerReviewItem {
  id: string;
  overallRating: number;
  punctuality: number;
  cleanliness: number;
  friendliness: number;
  satisfaction: number;
  comment: string | null;
  images: string[];
  taskerReply: string | null;
  taskerRepliedAt: string | null;
  reportCount: number;
  isAnonymous: boolean;
  createdAt: string;
  customerName: string | null;
  bookingCode: string | null;
}

export interface TaskerReviewsResponse {
  items: TaskerReviewItem[];
  total: number;
  page: number;
  limit: number;
  avgRating: number;
  totalReviews: number;
}
