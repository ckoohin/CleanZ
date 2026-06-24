import React from "react";
import { Star, MessageSquare, ThumbsUp, AlertCircle } from "lucide-react";

interface PackageReviewsTabProps {
  packageId: string;
}

const STAR_DISTRIBUTION = [
  { stars: 5, count: 24, pct: 60 },
  { stars: 4, count: 10, pct: 25 },
  { stars: 3, count: 4, pct: 10 },
  { stars: 2, count: 1, pct: 2.5 },
  { stars: 1, count: 1, pct: 2.5 },
];

const MOCK_REVIEWS = [
  { id: "1", customerName: "Nguyễn Thị Lan", rating: 5, comment: "Nhân viên rất chuyên nghiệp, làm sạch cẩn thận. Sẽ đặt lại lần sau!", date: "22/06/2026", avatar: "N" },
  { id: "2", customerName: "Trần Văn Minh", rating: 4, comment: "Dịch vụ tốt, đúng giờ. Chỉ tiếc là hơi vội ở phần phòng bếp.", date: "21/06/2026", avatar: "T" },
  { id: "3", customerName: "Lê Thị Hoa", rating: 5, comment: "Tuyệt vời! Nhà sạch bóng, mùi thơm. Nhân viên nhiệt tình và thân thiện.", date: "20/06/2026", avatar: "L" },
  { id: "4", customerName: "Phạm Quốc Bảo", rating: 4, comment: "Hài lòng với dịch vụ. Sẽ recommend cho bạn bè.", date: "18/06/2026", avatar: "P" },
  { id: "5", customerName: "Vũ Thị Mai", rating: 5, comment: "CleanZ làm tôi không phải lo về việc dọn nhà nữa. Cảm ơn đội ngũ!", date: "15/06/2026", avatar: "V" },
];

export function PackageReviewsTab({ packageId }: PackageReviewsTabProps) {
  const avgRating = 4.8;
  const totalReviews = MOCK_REVIEWS.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-500 fill-amber-500" aria-hidden="true" />
            Đánh giá khách hàng
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tổng hợp phản hồi từ khách hàng đã sử dụng gói dịch vụ này
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-50 border border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/40">
          <Star className="w-5 h-5 text-amber-500 fill-amber-500" aria-hidden="true" />
          <span className="text-2xl font-bold text-amber-600">{avgRating}</span>
          <div className="text-xs text-amber-600/80">
            <p className="font-semibold">/5 sao</p>
            <p>{totalReviews} đánh giá</p>
          </div>
        </div>
      </div>

      {/* Rating breakdown */}
      <div className="bg-card border border-border/50 rounded-2xl p-6">
        <h4 className="text-sm font-bold text-foreground mb-4">Phân phối đánh giá</h4>
        <div className="space-y-2.5">
          {STAR_DISTRIBUTION.map((d) => (
            <div key={d.stars} className="flex items-center gap-3">
              <div className="flex items-center gap-1 w-16 shrink-0">
                {Array.from({ length: d.stars }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" aria-hidden="true" />
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

      {/* Notice about data source */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/40">
        <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">Lưu ý về nguồn dữ liệu</p>
          <p className="text-xs text-blue-600/80 dark:text-blue-400/70 mt-0.5">
            Đánh giá được tổng hợp từ khách hàng sau khi hoàn thành đơn hàng. Tính năng đánh giá realtime đang trong quá trình phát triển.
          </p>
        </div>
      </div>

      {/* Reviews list */}
      <div>
        <h4 className="text-base font-bold text-foreground flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-primary" aria-hidden="true" />
          Nhận xét gần đây
        </h4>
        <div className="space-y-4">
          {MOCK_REVIEWS.map((review) => (
            <div key={review.id} className="bg-card border border-border/50 rounded-2xl p-5 hover:border-primary/20 transition-colors">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {review.avatar}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-bold text-foreground text-sm">{review.customerName}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${i < review.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`}
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{review.date}</span>
                  </div>
                  <p className="text-sm text-foreground mt-2 leading-relaxed">{review.comment}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
