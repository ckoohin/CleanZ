"use client";

import { useState } from "react";
import { Flag, MessageSquare, Send, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useTaskerReviews,
  useTaskerReplyReview,
  useTaskerReportReview,
} from "@/features/tasker/reviews/hooks/useTaskerReviews";
import {
  REPORT_REASONS,
  type ReportReason,
} from "@/features/tasker/reviews/services/tasker-review.service";
import type { TaskerReviewItem } from "@/features/tasker/reviews/types/tasker-review.types";

const STARS_FILL = (rating: number, size = "size-4") =>
  [1, 2, 3, 4, 5].map((s) => (
    <Star
      key={s}
      className={`${size} ${s <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/25"}`}
    />
  ));

export default function TaskerReviewsPage() {
  const [ratingFilter, setRatingFilter] = useState<number | undefined>();
  const [replyTarget, setReplyTarget] = useState<TaskerReviewItem | null>(null);
  const [reportTarget, setReportTarget] = useState<TaskerReviewItem | null>(
    null,
  );
  const [replyText, setReplyText] = useState("");
  const [reportReason, setReportReason] = useState<ReportReason>("SPAM");
  const [reportDesc, setReportDesc] = useState("");

  const { data, isLoading } = useTaskerReviews({ minRating: ratingFilter });
  const replyMutation = useTaskerReplyReview();
  const reportMutation = useTaskerReportReview();

  const handleReply = () => {
    if (!replyTarget || !replyText.trim()) return;
    replyMutation.mutate(
      { reviewId: replyTarget.id, reply: replyText.trim() },
      {
        onSuccess: () => {
          setReplyTarget(null);
          setReplyText("");
        },
      },
    );
  };

  const handleReport = () => {
    if (!reportTarget) return;
    reportMutation.mutate(
      {
        reviewId: reportTarget.id,
        reason: reportReason,
        description: reportDesc.trim() || undefined,
      },
      {
        onSuccess: () => {
          setReportTarget(null);
          setReportDesc("");
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-5 md:p-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Đánh giá
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Xem và phản hồi đánh giá từ khách hàng.
          </p>
        </div>
        {data && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {STARS_FILL(data.avgRating)}
              <span className="ml-1 text-lg font-black">
                {data.avgRating.toFixed(1)}
              </span>
            </div>
            <Badge variant="outline" className="rounded-full">
              {data.totalReviews} đánh giá
            </Badge>
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {[undefined, 5, 4, 3, 2, 1].map((star) => (
          <button
            key={String(star)}
            onClick={() => setRatingFilter(star)}
            className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              ratingFilter === star
                ? "border-primary bg-primary text-white"
                : "border-border hover:border-primary/50"
            }`}
          >
            {star === undefined ? (
              "Tất cả"
            ) : (
              <>
                <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
                {star} sao
              </>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : !data?.items.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-14 text-center">
          <Star className="mx-auto size-10 text-muted-foreground/40" />
          <p className="mt-3 font-bold">Chưa có đánh giá</p>
          <p className="text-sm text-muted-foreground">
            Hoàn thành đơn hàng để nhận đánh giá từ khách hàng.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.items.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onReply={() => {
                setReplyTarget(review);
                setReplyText("");
              }}
              onReport={() => {
                setReportTarget(review);
                setReportReason("SPAM");
                setReportDesc("");
              }}
            />
          ))}
        </div>
      )}

      {/* Reply Dialog */}
      <Dialog
        open={!!replyTarget}
        onOpenChange={(open) => !open && setReplyTarget(null)}
      >
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="size-5 text-primary" />
              Phản hồi đánh giá
            </DialogTitle>
            <DialogDescription>
              Bạn chỉ được phản hồi 1 lần duy nhất. Hãy viết thật chân thành.
            </DialogDescription>
          </DialogHeader>
          {replyTarget && (
            <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground italic">
              &ldquo;{replyTarget.comment ?? "(Không có nhận xét)"}&rdquo;
            </div>
          )}
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Cảm ơn quý khách đã sử dụng dịch vụ..."
            className="rounded-xl"
          />
          <p className="text-right text-xs text-muted-foreground">
            {replyText.length}/500
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setReplyTarget(null)}
            >
              Hủy
            </Button>
            <Button
              className="rounded-full"
              onClick={handleReply}
              disabled={!replyText.trim() || replyMutation.isPending}
            >
              <Send className="size-4" />
              {replyMutation.isPending ? "Đang gửi..." : "Gửi phản hồi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog
        open={!!reportTarget}
        onOpenChange={(open) => !open && setReportTarget(null)}
      >
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="size-5 text-destructive" />
              Báo cáo đánh giá
            </DialogTitle>
            <DialogDescription>
              Chỉ báo cáo khi đánh giá vi phạm rõ ràng. Chúng tôi sẽ xem xét
              trong vòng 24 giờ.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={reportReason}
              onValueChange={(v) => setReportReason(v as ReportReason)}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Chọn lý do" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REPORT_REASONS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={reportDesc}
              onChange={(e) => setReportDesc(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Mô tả thêm (không bắt buộc)..."
              className="rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setReportTarget(null)}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={handleReport}
              disabled={reportMutation.isPending}
            >
              <Flag className="size-4" />
              {reportMutation.isPending ? "Đang gửi..." : "Gửi báo cáo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReviewCard({
  review,
  onReply,
  onReport,
}: {
  review: TaskerReviewItem;
  onReply: () => void;
  onReport: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-9 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">
              {review.isAnonymous ? "?" : (review.customerName?.[0] ?? "K")}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">
              {review.isAnonymous
                ? "Ẩn danh"
                : (review.customerName ?? "Khách hàng")}
            </p>
            {review.bookingCode && (
              <p className="text-xs text-muted-foreground">
                #{review.bookingCode}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {STARS_FILL(review.overallRating)}
          <span className="ml-1 text-sm font-black">
            {Number(review.overallRating).toFixed(1)}
          </span>
        </div>
      </div>

      {review.comment && (
        <p className="text-sm text-foreground/80">
          &ldquo;{review.comment}&rdquo;
        </p>
      )}

      {review.images && review.images.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {review.images.map((url) => (
            <img
              key={url}
              src={url}
              alt=""
              className="h-16 w-16 rounded-xl object-cover border border-border"
            />
          ))}
        </div>
      )}

      {/* Criteria chips */}
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            { k: "punctuality", l: "Đúng giờ" },
            { k: "cleanliness", l: "Vệ sinh" },
            { k: "friendliness", l: "Thái độ" },
            { k: "satisfaction", l: "Hài lòng" },
          ] as const
        ).map(({ k, l }) => (
          <span
            key={k}
            className="text-xs rounded-full border border-border px-2 py-0.5 text-muted-foreground"
          >
            {l}: {review[k]}/5
          </span>
        ))}
      </div>

      {/* Tasker reply */}
      {review.taskerReply ? (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
          <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">
            Phản hồi của bạn
          </p>
          <p className="text-sm text-foreground/80">{review.taskerReply}</p>
        </div>
      ) : null}

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-muted-foreground">
          {new Date(review.createdAt).toLocaleDateString("vi-VN")}
          {review.reportCount > 0 && (
            <span className="ml-2 text-destructive">
              · {review.reportCount} báo cáo
            </span>
          )}
        </p>
        <div className="flex gap-2">
          {!review.taskerReply && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-full h-7 text-xs gap-1"
              onClick={onReply}
            >
              <MessageSquare className="size-3" />
              Phản hồi
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full h-7 text-xs gap-1 text-muted-foreground hover:text-destructive"
            onClick={onReport}
          >
            <Flag className="size-3" />
            Báo cáo
          </Button>
        </div>
      </div>
    </div>
  );
}
