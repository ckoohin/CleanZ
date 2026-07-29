"use client";

import React from "react";
import { Star, MessageSquareText, ShieldAlert } from "lucide-react";
import { AdminCard } from "@/components/admin";
import { Badge } from "@/components/ui/badge";
import { useAdminTaskerReviews } from "../hooks/admin-tasker.hooks";
import type { TaskerReviewItem } from "../types/admin-tasker.types";

const MOCK_REVIEWS = [
  {
    id: "rev_01",
    customerName: "Nguyễn Văn A",
    rating: 5,
    comment: "Cô làm việc rất nhanh nhẹn, sạch sẽ. Mình rất ưng ý.",
    tags: ["Đúng giờ", "Sạch sẽ", "Thân thiện"],
    createdAt: "2026-07-28T14:30:00Z",
    bookingCode: "BK-98213",
  },
  {
    id: "rev_02",
    customerName: "Trần Thị B",
    rating: 4,
    comment: "Làm tốt nhưng đến trễ 10 phút do kẹt xe.",
    tags: ["Sạch sẽ"],
    createdAt: "2026-07-25T09:15:00Z",
    bookingCode: "BK-88124",
  }
];

const MOCK_INCIDENTS = [
  {
    id: "inc_01",
    customerName: "Lê Văn C",
    issue: "Khách báo Tasker làm vỡ bình hoa trị giá 500k",
    severity: "HIGH",
    status: "RESOLVED",
    deductedAmount: 250000,
    createdAt: "2026-06-10T10:00:00Z",
    bookingCode: "BK-77213",
  }
];

export const TaskerReviewsTab: React.FC<{ taskerId: string; avgRating: number; totalJobs: number }> = ({ taskerId, avgRating, totalJobs }) => {
  const { data: reviewsResponse, isLoading } = useAdminTaskerReviews(taskerId);
  const reviewsData = reviewsResponse?.data || [];
  const incidentsData = MOCK_INCIDENTS; // TODO: Implement incidents API if needed

  // Dùng mock fallback nếu API chưa trả data
  const reviews = reviewsData.length > 0 ? reviewsData : MOCK_REVIEWS;

  if (isLoading) return <div className="p-8 text-center text-(--c-muted)">Đang tải đánh giá...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        
        {/* Rating Summary */}
        <div className="space-y-6">
          <AdminCard className="p-6 flex flex-col items-center justify-center text-center">
            <p className="text-6xl font-black leading-none text-(--c-ink)">
              {avgRating > 0 ? avgRating.toFixed(1) : "—"}
            </p>
            <div className="flex items-center gap-1 mt-3 text-(--c-primary)">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-6 h-6 ${i < Math.round(avgRating) ? "fill-(--c-primary) text-(--c-primary)" : "text-(--c-muted)/30"}`}
                  aria-hidden="true"
                />
              ))}
            </div>
            <p className="text-sm font-semibold text-(--c-muted) mt-3">
              Dựa trên {totalJobs} đánh giá
            </p>
            
            <div className="w-full mt-6 space-y-2">
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-8 text-right font-medium text-(--c-ink)">{star} sao</span>
                  <div className="flex-1 h-2 bg-(--c-card-2) rounded-full overflow-hidden">
                    <div className="h-full bg-(--c-primary) rounded-full" style={{ width: star === 5 ? '80%' : star === 4 ? '15%' : '0%' }} />
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>

          <AdminCard className="p-5 border-[rgba(225,29,72,0.2)] bg-[rgba(225,29,72,0.03)]">
            <h3 className="text-sm font-bold text-[#E11D48] flex items-center gap-2 mb-3">
              <ShieldAlert className="w-4 h-4" /> Sự cố (Incidents)
            </h3>
            {MOCK_INCIDENTS.map(inc => (
              <div key={inc.id} className="bg-white dark:bg-[#0D1B3E] rounded-xl p-3 border border-[rgba(225,29,72,0.1)]">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-bold text-(--c-muted)">{inc.bookingCode}</span>
                  <Badge variant="outline" className="text-[9px] uppercase bg-[rgba(225,29,72,0.1)] text-[#E11D48] border-none">{inc.status}</Badge>
                </div>
                <p className="text-xs font-semibold text-(--c-ink) leading-tight">{inc.issue}</p>
                <p className="text-[10px] text-(--c-muted) mt-2 border-t border-(--c-line) pt-2">
                  Đã đền bù: <span className="font-bold text-[#E11D48]">{inc.deductedAmount.toLocaleString()}đ</span>
                </p>
              </div>
            ))}
          </AdminCard>
        </div>

        {/* Reviews List */}
        <AdminCard className="overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-(--c-line) bg-(--c-card)">
            <div className="flex items-center gap-2">
              <MessageSquareText className="w-5 h-5 text-(--c-primary-strong)" />
              <h3 className="text-sm font-bold text-(--c-ink)">Đánh giá mới nhất</h3>
            </div>
          </div>
          
          <div className="divide-y divide-(--c-line) overflow-y-auto max-h-150">
            {reviews.map((review: TaskerReviewItem) => (
              <div key={review.id} className="p-5 hover:bg-(--c-card-2)/50 transition-colors">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h4 className="font-bold text-(--c-ink)">{review.customerName}</h4>
                    <span className="text-xs text-(--c-muted)">{new Date(review.createdAt).toLocaleDateString("vi-VN")} • {review.bookingCode}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? "fill-(--c-primary) text-(--c-primary)" : "text-(--c-muted)/30"}`} />
                    ))}
                  </div>
                </div>
                
                <p className="text-sm text-(--c-ink-soft) italic mb-3">{review.comment}</p>
                
                <div className="flex flex-wrap gap-1.5">
                  {review.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-[10px] bg-(--c-card) text-(--c-muted) border-(--c-line)">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </AdminCard>

      </div>
    </div>
  );
};
