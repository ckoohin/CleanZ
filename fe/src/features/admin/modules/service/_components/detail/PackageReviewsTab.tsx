import React, { useState } from "react";
import { Star, MessageSquare, Loader2, Inbox } from "lucide-react";
import { usePackageReviews } from "@/features/customer/history/hooks/useReview";
import { Button } from "@/components/ui/button";

interface PackageReviewsTabProps {
  packageId: string;
}

export function PackageReviewsTab({ packageId }: PackageReviewsTabProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePackageReviews(packageId, page, 10);

  const avgRating = data?.avgRating ?? 0;
  const totalReviews = data?.totalReviews ?? 0;
  const distribution = data?.distribution ?? [];
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[var(--c-ink)] flex items-center gap-2">
            <Star className="w-6 h-6 text-[#D97706] fill-[#D97706]" aria-hidden="true" />
            Đánh giá khách hàng
          </h3>
          <p className="text-sm text-[var(--c-muted)] mt-0.5">
            Tổng hợp phản hồi từ khách hàng đã sử dụng gói dịch vụ này
          </p>
        </div>
        {totalReviews > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-50 border border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/40">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <span className="text-2xl font-bold text-amber-600">{avgRating.toFixed(1)}</span>
            <div className="text-xs text-amber-600/80">
              <p className="font-semibold">/5 sao</p>
              <p>{totalReviews} đánh giá</p>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : totalReviews === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
          <Inbox className="w-12 h-12 opacity-30" />
          <p className="text-sm">Chưa có đánh giá nào cho gói dịch vụ này</p>
        </div>
      ) : (
        <>
          {/* Rating breakdown */}
          <div className="bg-card border border-border/50 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-foreground mb-4">Phân phối đánh giá</h4>
            <div className="space-y-2.5">
              {distribution.map((d) => (
                <div key={d.stars} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16 shrink-0">
                    {Array.from({ length: d.stars }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <div className="flex-1 h-2.5 bg-muted/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${d.pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right font-medium">{d.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews list */}
          <div>
            <h4 className="text-base font-bold text-foreground flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-primary" />
              Nhận xét gần đây
            </h4>
            <div className="space-y-4">
              {items.map((review) => (
                <div
                  key={review.id}
                  className="bg-card border border-border/50 rounded-2xl p-5 hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-primary font-bold text-sm shrink-0 overflow-hidden">
                      {review.avatar ? (
                        <img src={review.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        review.customerName?.[0] ?? "K"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-bold text-foreground text-sm">
                            {review.customerName ?? "Ẩn danh"}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${i < Math.round(review.overallRating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(review.createdAt).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-foreground mt-2 leading-relaxed">{review.comment}</p>
                      )}
                      {review.adminReply && (
                        <div className="mt-3 bg-primary/5 border border-primary/15 rounded-xl px-3 py-2">
                          <p className="text-xs font-bold text-primary mb-0.5">Phản hồi từ CleanZ</p>
                          <p className="text-xs text-foreground/80">{review.adminReply}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  Trước
                </Button>
                <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Sau
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
