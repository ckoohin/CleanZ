"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Star,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useBookingDetail } from "@/features/booking/hooks/useCustomerBooking";
import { useMyReview, useCreateReview } from "../hooks/useReview";

const CRITERIA = [
  { key: "punctuality" as const, label: "Đúng giờ" },
  { key: "cleanliness" as const, label: "Vệ sinh" },
  { key: "friendliness" as const, label: "Thái độ" },
  { key: "satisfaction" as const, label: "Hài lòng" },
];

const RATING_LABELS = ["", "Rất tệ", "Tệ", "Bình thường", "Tốt", "Tuyệt vời!"];
const BOOKING_SYNC_INTERVAL_MS = 1500;
const BOOKING_SYNC_TIMEOUT_MS = 15_000;

function ReviewHeader({
  title = "Đánh giá Dịch vụ",
  onBack,
}: {
  title?: string;
  onBack: () => void;
}) {
  return (
    <div className="px-4 py-4 sticky top-0 bg-background z-10 border-b border-border/50 flex items-center gap-3">
      <button
        onClick={onBack}
        className="p-2 -ml-2 rounded-full hover:bg-muted"
      >
        <X className="w-5 h-5 text-foreground/90" />
      </button>
      <h1 className="text-lg font-bold text-foreground">{title}</h1>
    </div>
  );
}

function ReviewStateCard({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>
        <p className="font-bold text-foreground">{title}</p>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {action}
      </div>
    </div>
  );
}

function StarPicker({
  value,
  onChange,
  size = "lg",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "sm" | "lg";
}) {
  const [hovered, setHovered] = useState(0);
  const sz = size === "lg" ? "w-10 h-10" : "w-6 h-6";
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
        >
          <Star
            className={`${sz} transition-colors ${
              (hovered || value) >= star
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30 fill-muted/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export const ReviewForm = ({ bookingId }: { bookingId: string }) => {
  const router = useRouter();
  const {
    data: bookingData,
    error: bookingError,
    isLoading: isBookingLoading,
    isFetching: isBookingFetching,
    refetch: refetchBooking,
  } = useBookingDetail(bookingId, {
    staleTime: 0,
    refetchOnMount: "always",
  });
  const {
    data: existingReview,
    error: reviewError,
    isLoading: isReviewLoading,
    isFetching: isReviewFetching,
    refetch: refetchReview,
  } = useMyReview(bookingId);
  const createReview = useCreateReview(bookingId);

  const [overallRating, setOverallRating] = useState(0);
  const [criteria, setCriteria] = useState({
    punctuality: 5,
    cleanliness: 5,
    friendliness: 5,
    satisfaction: 5,
  });
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [images] = useState<string[]>([]);
  const [uploadingCount] = useState(0);
  const [syncTimedOut, setSyncTimedOut] = useState(false);
  const [syncCycle, setSyncCycle] = useState(0);
  const syncStartedAtRef = useRef<number | null>(null);

  const isLoading = isBookingLoading || isReviewLoading;
  const booking = bookingData;
  const tasker = booking?.tasker;
  const alreadyReviewed = !!existingReview?.review;

  useEffect(() => {
    if (
      !bookingId ||
      isBookingLoading ||
      bookingError ||
      booking?.status === "COMPLETED"
    ) {
      syncStartedAtRef.current = null;
      setSyncTimedOut(false);
      return;
    }

    syncStartedAtRef.current ??= Date.now();
    const timer = window.setInterval(() => {
      const syncStartedAt = syncStartedAtRef.current;
      if (
        syncStartedAt !== null &&
        Date.now() - syncStartedAt >= BOOKING_SYNC_TIMEOUT_MS
      ) {
        window.clearInterval(timer);
        setSyncTimedOut(true);
        return;
      }
      void refetchBooking();
    }, BOOKING_SYNC_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [
    booking?.status,
    bookingError,
    bookingId,
    isBookingLoading,
    refetchBooking,
    syncCycle,
  ]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ReviewHeader onBack={() => router.back()} />
        <ReviewStateCard
          icon={<Loader2 className="w-7 h-7 animate-spin" />}
          title="Đang mở đánh giá"
          description="CleanZ đang tải dữ liệu đơn hàng và kiểm tra đánh giá hiện có."
        />
      </div>
    );
  }

  if (bookingError || reviewError) {
    return (
      <div className="min-h-screen bg-background">
        <ReviewHeader onBack={() => router.back()} />
        <ReviewStateCard
          icon={<AlertTriangle className="h-7 w-7 text-amber-500" />}
          title="Chưa thể mở đánh giá"
          description="Dữ liệu đơn hàng vừa được cập nhật. Vui lòng thử lại sau vài giây."
          action={
            <button
              type="button"
              onClick={() => {
                void Promise.all([refetchBooking(), refetchReview()]);
              }}
              disabled={isBookingFetching || isReviewFetching}
              className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
            >
              {isBookingFetching || isReviewFetching ? "Đang thử lại..." : "Thử lại"}
            </button>
          }
        />
      </div>
    );
  }

  if (!booking || booking.status !== "COMPLETED") {
    return (
      <div className="min-h-screen bg-background">
        <ReviewHeader onBack={() => router.back()} />
        <ReviewStateCard
          icon={
            isBookingFetching && !syncTimedOut ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : (
              <AlertTriangle className="h-7 w-7" />
            )
          }
          title={
            syncTimedOut
              ? "Chưa thể đồng bộ đơn hàng"
              : booking
              ? "Đang đồng bộ trạng thái đơn hàng"
              : "Chưa tìm thấy dữ liệu đơn hàng"
          }
          description={
            syncTimedOut
              ? "Hệ thống chưa nhận được trạng thái hoàn thành. Bạn có thể kiểm tra lại hoặc quay về chi tiết đơn."
              : "Nếu Tasker vừa hoàn thành đơn, hệ thống sẽ tự cập nhật trong vài giây trước khi mở form đánh giá."
          }
          action={
            <button
              type="button"
              onClick={() => {
                syncStartedAtRef.current = Date.now();
                setSyncCycle((cycle) => cycle + 1);
                void refetchBooking();
              }}
              disabled={isBookingFetching}
              className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
            >
              {isBookingFetching ? "Đang kiểm tra..." : "Kiểm tra lại"}
            </button>
          }
        />
      </div>
    );
  }

  if (alreadyReviewed) {
    const r = existingReview!.review!;
    return (
      <div className="min-h-screen bg-background">
        <div className="px-4 py-4 sticky top-0 bg-background z-10 border-b border-border/50 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-muted"
          >
            <X className="w-5 h-5 text-foreground/90" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Đánh giá của bạn</h1>
        </div>
        <div className="p-6 max-w-md mx-auto space-y-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <CheckCircle2 className="w-14 h-14 text-emerald-500" />
            <p className="font-bold text-foreground text-lg">
              Bạn đã đánh giá đơn hàng này
            </p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-6 h-6 ${s <= r.overallRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
                />
              ))}
              <span className="text-sm font-bold text-foreground ml-1">
                {Number(r.overallRating).toFixed(1)}/5
              </span>
            </div>
            {r.isAnonymous && (
              <p className="text-xs text-muted-foreground italic">Ẩn danh</p>
            )}
            {r.comment && (
              <p className="text-sm text-foreground/80 italic">&ldquo;{r.comment}&rdquo;</p>
            )}
            {r.images && r.images.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-1">
                {r.images.map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover border border-border"
                  />
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {new Date(r.createdAt).toLocaleDateString("vi-VN")}
            </p>
            {r.taskerReply && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mt-2">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">
                  Phản hồi từ Tasker
                </p>
                <p className="text-sm text-foreground/80">{r.taskerReply}</p>
              </div>
            )}
            {r.adminReply && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mt-2">
                <p className="text-xs font-bold text-primary mb-1">
                  Phản hồi từ CleanZ
                </p>
                <p className="text-sm text-foreground/80">{r.adminReply}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (overallRating === 0 || createReview.isPending || uploadingCount > 0)
      return;
    createReview.mutate({
      overallRating,
      ...criteria,
      comment: comment.trim() || undefined,
      isAnonymous,
      images: images.length ? images : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 py-4 sticky top-0 bg-background z-10 border-b border-border/50 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-muted"
        >
          <X className="w-5 h-5 text-foreground/90" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Đánh giá Dịch vụ</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-6 max-w-md mx-auto space-y-8">
        {/* Tasker info */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto overflow-hidden flex items-center justify-center">
            {tasker?.avatarUrl ? (
              <img
                src={tasker.avatarUrl}
                alt={tasker.fullName ?? ""}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-primary">
                {tasker?.fullName?.[0] ?? "T"}
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {tasker?.fullName ?? "Tasker"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Mã đơn: #{booking?.bookingCode ?? bookingId.slice(0, 8)}
          </p>
        </div>

        {/* Overall rating */}
        <div className="flex flex-col items-center gap-3">
          <p className="font-bold text-foreground/90">
            Chất lượng dịch vụ thế nào?
          </p>
          <StarPicker
            value={overallRating}
            onChange={setOverallRating}
            size="lg"
          />
          <p className="text-sm font-medium text-primary h-5">
            {RATING_LABELS[overallRating]}
          </p>
        </div>

        {/* Criteria ratings */}
        <div className="bg-muted/30 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-foreground/80 mb-1">
            Tiêu chí chi tiết
          </p>
          {CRITERIA.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <span className="text-sm text-foreground/80 min-w-[70px]">
                {label}
              </span>
              <StarPicker
                value={criteria[key]}
                onChange={(v) => setCriteria((prev) => ({ ...prev, [key]: v }))}
                size="sm"
              />
            </div>
          ))}
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-bold text-foreground/90 mb-2">
            Nhận xét chi tiết{" "}
            <span className="font-normal text-muted-foreground">
              (Không bắt buộc)
            </span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            placeholder="Chia sẻ trải nghiệm của bạn về dịch vụ này..."
            className="w-full bg-background border border-border rounded-2xl p-4 text-sm text-foreground/90 placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 outline-none min-h-[120px] resize-none"
          />
          <p className="text-xs text-muted-foreground text-right mt-1">
            {comment.length}/1000
          </p>
        </div>

        {/* Image upload */}
        {/* <div>
          <p className="text-sm font-bold text-foreground/90 mb-3">
            Ảnh minh chứng{" "}
          </p>
          <div className="flex flex-wrap gap-3">
            {images.map((url, i) => (
              <div
                key={url}
                className="relative w-20 h-20 rounded-xl overflow-hidden border border-border"
              >
                <img
                  src={url}
                  alt={`Ảnh ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setImages((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 hover:bg-black/80"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {uploadingCount > 0 &&
              Array.from({ length: uploadingCount }).map((_, i) => (
                <div
                  key={`uploading-${i}`}
                  className="w-20 h-20 rounded-xl border border-border flex items-center justify-center bg-muted/30"
                >
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ))}
            {images.length < MAX_IMAGES && uploadingCount === 0 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
              >
                <Camera className="w-6 h-6" />
                <span className="text-xs">Thêm ảnh</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImagePick}
          />
        </div> */}

        {/* Anonymous toggle */}
        <button
          type="button"
          onClick={() => setIsAnonymous((v) => !v)}
          className={`w-full flex items-center justify-between gap-3 p-4 rounded-2xl border transition-colors ${
            isAnonymous
              ? "border-primary/40 bg-primary/5"
              : "border-border bg-background"
          }`}
        >
          <div className="flex min-w-0 items-center gap-3">
            {isAnonymous ? (
              <EyeOff className="w-5 h-5 shrink-0 text-primary" />
            ) : (
              <Eye className="w-5 h-5 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 text-left">
              <p
                className={`text-sm font-bold ${isAnonymous ? "text-primary" : "text-foreground/90"}`}
              >
                Đăng ẩn danh
              </p>
              <p className="text-xs text-muted-foreground">
                {isAnonymous
                  ? "Tên của bạn sẽ không hiển thị"
                  : "Tên của bạn sẽ hiển thị cùng đánh giá"}
              </p>
            </div>
          </div>
          <div
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${isAnonymous ? "bg-primary" : "bg-muted"}`}
          >
            <span
              className={`absolute left-0.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform duration-200 ${isAnonymous ? "translate-x-5" : "translate-x-0"}`}
            />
          </div>
        </button>

        {/* Submit */}
        <button
          type="submit"
          disabled={
            overallRating === 0 ||
            createReview.isPending ||
            uploadingCount > 0
          }
          className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
        >
          {createReview.isPending || uploadingCount > 0 ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {uploadingCount > 0 ? "Đang tải ảnh..." : "Đang gửi..."}
            </>
          ) : (
            "Gửi đánh giá"
          )}
        </button>
      </form>
    </div>
  );
};
