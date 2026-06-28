"use client";

import { useState, useMemo } from "react";
import {
  Star,
  Eye,
  EyeOff,
  MessageSquare,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Inbox,
  BarChart3,
  Flag,
  Download,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from "lucide-react";
import {
  useAdminReviews,
  useAdminReviewDashboard,
  useAdminReports,
  useToggleHideReview,
  useSetAdminReply,
  useDecideReport,
} from "../hooks/useAdminReviews";
import { adminReviewApi } from "../services/review-admin.service";
import type {
  AdminReviewItem,
  AdminReviewQuery,
  AdminReportItem,
} from "../types/review-admin.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StarDisplay({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${s <= rounded ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/30"}`}
        />
      ))}
      <span className="text-xs font-bold text-foreground ml-1">
        {Number(value).toFixed(1)}
      </span>
    </div>
  );
}

function CriteriaChips({ row }: { row: AdminReviewItem }) {
  const items = [
    { label: "Đúng giờ", value: row.punctuality },
    { label: "Vệ sinh", value: row.cleanliness },
    { label: "Thái độ", value: row.friendliness },
    { label: "Hài lòng", value: row.satisfaction },
  ];
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {items.map(({ label, value }) => (
        <span
          key={label}
          className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium border ${
            value >= 4
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800"
              : value === 3
                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
                : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:border-red-800"
          }`}
        >
          {label} {value}★
        </span>
      ))}
    </div>
  );
}

// ─── Reply Dialog ─────────────────────────────────────────────────────────────

function ReplyDialog({
  review,
  open,
  onClose,
}: {
  review: AdminReviewItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const [text, setText] = useState(review?.adminReply ?? "");
  const replyMutation = useSetAdminReply();
  if (!review) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Phản hồi đánh giá
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="bg-muted/40 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">
                {review.customerName ?? "Ẩn danh"}
              </span>
              <StarDisplay value={review.overallRating} />
            </div>
            {review.comment && (
              <p className="text-sm text-muted-foreground italic">
                {review.comment}
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-bold text-foreground/80 block mb-2">
              Phản hồi của Platform
            </label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhập phản hồi công khai..."
              className="rounded-xl"
              maxLength={500}
              rows={4}
            />
            <p className="text-xs text-muted-foreground text-right">
              {text.length}/500
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button
              onClick={() =>
                replyMutation.mutate(
                  { id: review.id, reply: text || null },
                  { onSuccess: onClose },
                )
              }
              disabled={replyMutation.isPending}
            >
              {replyMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Lưu phản hồi
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab() {
  const { data, isLoading } = useAdminReviewDashboard();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!data)
    return <p className="text-center text-muted-foreground py-10">Không có dữ liệu</p>;

  const maxDist = Math.max(...data.distribution.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <p className="text-xs text-muted-foreground font-medium">Điểm TB</p>
          <div className="flex items-end gap-1.5 mt-2">
            <span className="text-3xl font-black text-amber-500">
              {data.summary.avgRating.toFixed(1)}
            </span>
            <Star className="size-5 fill-amber-400 text-amber-400 mb-1" />
          </div>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <p className="text-xs text-muted-foreground font-medium">Tổng đánh giá</p>
          <p className="text-3xl font-black mt-2">{data.summary.total}</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <p className="text-xs text-muted-foreground font-medium">NPS Score</p>
          <p
            className={`text-3xl font-black mt-2 ${data.summary.nps >= 0 ? "text-emerald-600" : "text-red-600"}`}
          >
            {data.summary.nps > 0 ? "+" : ""}
            {data.summary.nps}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-5">
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
            Chờ duyệt báo cáo
          </p>
          <p className="text-3xl font-black text-amber-600 mt-2">
            {data.pendingReports}
          </p>
        </div>
      </div>

      {/* Criteria averages */}
      <div className="rounded-2xl border border-border/50 bg-card p-5">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="size-4 text-primary" />
          Điểm trung bình theo tiêu chí
        </h3>
        <div className="space-y-3">
          {[
            { label: "Đúng giờ", value: data.summary.criteria.punctuality },
            { label: "Vệ sinh", value: data.summary.criteria.cleanliness },
            { label: "Thái độ", value: data.summary.criteria.friendliness },
            { label: "Hài lòng", value: data.summary.criteria.satisfaction },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-20 shrink-0">
                {label}
              </span>
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(value / 5) * 100}%` }}
                />
              </div>
              <span className="text-sm font-bold w-8 text-right">
                {value.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Distribution */}
      <div className="rounded-2xl border border-border/50 bg-card p-5">
        <h3 className="text-sm font-bold mb-4">Phân bố điểm đánh giá</h3>
        <div className="space-y-2">
          {data.distribution.map(({ stars, count, pct }) => (
            <div key={stars} className="flex items-center gap-3">
              <div className="flex items-center gap-1 w-14 shrink-0">
                <Star className="size-3.5 fill-amber-400 text-amber-400" />
                <span className="text-sm font-medium">{stars}</span>
              </div>
              <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${(count / maxDist) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-16 text-right">
                {count} ({pct}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────

function ReportsTab() {
  const [statusFilter, setStatusFilter] =
    useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [page, setPage] = useState(1);
  const [decideTarget, setDecideTarget] = useState<AdminReportItem | null>(null);
  const [decideNote, setDecideNote] = useState("");

  const params = {
    page,
    limit: 20,
    status:
      statusFilter === "ALL"
        ? undefined
        : (statusFilter as "PENDING" | "APPROVED" | "REJECTED"),
  };

  const { data, isLoading } = useAdminReports(params);
  const decideMutation = useDecideReport();

  const statusBadge = (status: string) => {
    if (status === "PENDING")
      return <Badge className="bg-amber-100 text-amber-800">Chờ duyệt</Badge>;
    if (status === "APPROVED")
      return <Badge className="bg-emerald-100 text-emerald-800">Đã duyệt</Badge>;
    return <Badge className="bg-muted text-muted-foreground">Từ chối</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {(
          [
            { v: "PENDING", l: "Chờ duyệt" },
            { v: "APPROVED", l: "Đã duyệt" },
            { v: "REJECTED", l: "Đã từ chối" },
            { v: "ALL", l: "Tất cả" },
          ] as const
        ).map(({ v, l }) => (
          <button
            key={v}
            onClick={() => { setStatusFilter(v); setPage(1); }}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === v
                ? "border-primary bg-primary text-white"
                : "border-border hover:border-primary/50"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : !data?.items.length ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground gap-3">
          <Flag className="w-10 h-10 opacity-30" />
          <p className="text-sm">Không có báo cáo nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((report) => (
            <div
              key={report.id}
              className="rounded-2xl border border-border/50 bg-card p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {statusBadge(report.status)}
                    <span className="text-xs font-bold text-foreground">
                      {report.reason}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Báo cáo bởi: {report.reporterName ?? "—"} ·{" "}
                    {fmtDate(report.createdAt)}
                  </p>
                </div>
                {report.status === "PENDING" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full h-7 text-xs gap-1 text-emerald-600 border-emerald-200"
                      onClick={() => {
                        setDecideTarget(report);
                        setDecideNote("");
                      }}
                    >
                      <CheckCircle2 className="size-3.5" />
                      Duyệt & Ẩn
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full h-7 text-xs gap-1 text-muted-foreground"
                      onClick={() =>
                        decideMutation.mutate({
                          reportId: report.id,
                          decision: "REJECT",
                        })
                      }
                      disabled={decideMutation.isPending}
                    >
                      <XCircle className="size-3.5" />
                      Từ chối
                    </Button>
                  </div>
                )}
              </div>
              {report.description && (
                <p className="text-sm text-foreground/80 italic">
                  "{report.description}"
                </p>
              )}
              {report.reviewComment && (
                <div className="bg-muted/30 rounded-xl p-2.5">
                  <p className="text-xs text-muted-foreground mb-1">
                    Nội dung đánh giá bị báo cáo:
                  </p>
                  <p className="text-sm">"{report.reviewComment}"</p>
                </div>
              )}
              {report.adminNote && (
                <p className="text-xs text-muted-foreground">
                  Ghi chú admin: {report.adminNote}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {(data?.total ?? 0) > 20 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {page} / {Math.ceil((data?.total ?? 0) / 20)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= Math.ceil((data?.total ?? 0) / 20)}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Decide Dialog */}
      <Dialog
        open={!!decideTarget}
        onOpenChange={(o) => !o && setDecideTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              Duyệt báo cáo & Ẩn đánh giá
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Duyệt sẽ đánh dấu báo cáo là hợp lệ và ẩn đánh giá bị báo cáo
              khỏi danh sách công khai.
            </p>
            <Textarea
              value={decideNote}
              onChange={(e) => setDecideNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Ghi chú nội bộ (không bắt buộc)..."
              className="rounded-xl"
            />
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setDecideTarget(null)}
              >
                Hủy
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  if (!decideTarget) return;
                  decideMutation.mutate(
                    {
                      reportId: decideTarget.id,
                      decision: "APPROVE",
                      note: decideNote.trim() || undefined,
                    },
                    { onSuccess: () => setDecideTarget(null) },
                  );
                }}
                disabled={decideMutation.isPending}
              >
                {decideMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Duyệt & Ẩn
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Reviews Tab ──────────────────────────────────────────────────────────────

const RATING_OPTIONS = [
  { value: "ALL", label: "Tất cả sao" },
  { value: "5", label: "5 sao" },
  { value: "4", label: "4 sao" },
  { value: "3", label: "3 sao" },
  { value: "1-2", label: "≤ 2 sao" },
];

const HIDDEN_OPTIONS = [
  { value: "ALL", label: "Tất cả" },
  { value: "false", label: "Đang hiển thị" },
  { value: "true", label: "Đã ẩn" },
];

function ReviewsTab() {
  const [filters, setFilters] = useState<AdminReviewQuery>({ page: 1, limit: 20 });
  const [ratingFilter, setRatingFilter] = useState("ALL");
  const [hiddenFilter, setHiddenFilter] = useState("ALL");
  const [taskerSearch, setTaskerSearch] = useState("");
  const [replyTarget, setReplyTarget] = useState<AdminReviewItem | null>(null);
  const toggleHide = useToggleHideReview();
  const [isExporting, setIsExporting] = useState(false);

  const query = useMemo<AdminReviewQuery>(() => {
    const q: AdminReviewQuery = { page: filters.page, limit: filters.limit };
    if (filters.fromDate) q.fromDate = filters.fromDate;
    if (filters.toDate) q.toDate = filters.toDate;
    if (ratingFilter === "5") { q.minRating = 5; q.maxRating = 5; }
    else if (ratingFilter === "4") { q.minRating = 4; q.maxRating = 4; }
    else if (ratingFilter === "3") { q.minRating = 3; q.maxRating = 3; }
    else if (ratingFilter === "1-2") { q.minRating = 1; q.maxRating = 2; }
    if (hiddenFilter !== "ALL") q.isHidden = hiddenFilter === "true";
    if (taskerSearch) q.taskerId = taskerSearch;
    return q;
  }, [filters, ratingFilter, hiddenFilter, taskerSearch]);

  const { data, isLoading } = useAdminReviews(query);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / (filters.limit ?? 20));

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await adminReviewApi.exportCsv(query);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reviews_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Xuất CSV thất bại");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RATING_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={hiddenFilter} onValueChange={setHiddenFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HIDDEN_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          className="w-36"
          value={filters.fromDate ?? ""}
          onChange={(e) =>
            setFilters((p) => ({
              ...p,
              fromDate: e.target.value || undefined,
              page: 1,
            }))
          }
        />
        <Input
          type="date"
          className="w-36"
          value={filters.toDate ?? ""}
          onChange={(e) =>
            setFilters((p) => ({
              ...p,
              toDate: e.target.value || undefined,
              page: 1,
            }))
          }
        />

        {(ratingFilter !== "ALL" ||
          hiddenFilter !== "ALL" ||
          filters.fromDate ||
          filters.toDate ||
          taskerSearch) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRatingFilter("ALL");
              setHiddenFilter("ALL");
              setTaskerSearch("");
              setFilters({ page: 1, limit: 20 });
            }}
          >
            <X className="w-4 h-4 mr-1" /> Xóa bộ lọc
          </Button>
        )}

        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-1.5"
            onClick={handleExport}
            disabled={isExporting || !items.length}
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Xuất CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-muted-foreground gap-3">
          <Inbox className="w-12 h-12 opacity-30" />
          <p className="text-sm">Không có đánh giá nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((review) => (
            <div
              key={review.id}
              className={`bg-card border rounded-2xl p-5 space-y-3 transition-colors ${
                review.isHidden
                  ? "border-border/30 opacity-60"
                  : "border-border/50"
              }`}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 overflow-hidden">
                    {review.customerAvatar ? (
                      <img
                        src={review.customerAvatar}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (review.customerName?.[0] ?? "K")
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm">
                      {review.isAnonymous
                        ? "Ẩn danh"
                        : (review.customerName ?? "Khách hàng")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tasker: {review.taskerName ?? "—"}
                      {review.bookingCode && (
                        <span className="ml-2 font-mono">
                          #{review.bookingCode}
                        </span>
                      )}
                    </p>
                    <StarDisplay value={review.overallRating} />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  {review.reportCount > 0 && (
                    <Badge className="bg-red-100 text-red-800 text-xs">
                      <Flag className="size-2.5 mr-1" />
                      {review.reportCount} báo cáo
                    </Badge>
                  )}
                  {review.isHidden && (
                    <Badge
                      variant="outline"
                      className="text-xs text-muted-foreground"
                    >
                      Đã ẩn
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {fmtDate(review.createdAt)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleHide.mutate(review.id)}
                    disabled={toggleHide.isPending}
                    title={review.isHidden ? "Hiện đánh giá" : "Ẩn đánh giá"}
                  >
                    {review.isHidden ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyTarget(review)}
                    title="Phản hồi"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <CriteriaChips row={review} />

              {review.comment && (
                <p className="text-sm text-foreground/80 italic">
                  "{review.comment}"
                </p>
              )}

              {review.images && review.images.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {review.images.map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt=""
                      className="h-14 w-14 rounded-xl object-cover border border-border"
                    />
                  ))}
                </div>
              )}

              {review.taskerReply && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">
                    Phản hồi Tasker
                  </p>
                  <p className="text-sm text-foreground/80">{review.taskerReply}</p>
                </div>
              )}

              {review.adminReply && (
                <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-2.5">
                  <p className="text-xs font-bold text-primary mb-1">
                    Phản hồi của Platform
                  </p>
                  <p className="text-sm text-foreground/80">{review.adminReply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={(filters.page ?? 1) <= 1}
            onClick={() =>
              setFilters((p) => ({ ...p, page: (p.page ?? 1) - 1 }))
            }
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {filters.page ?? 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={(filters.page ?? 1) >= totalPages}
            onClick={() =>
              setFilters((p) => ({ ...p, page: (p.page ?? 1) + 1 }))
            }
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <ReplyDialog
        review={replyTarget}
        open={!!replyTarget}
        onClose={() => setReplyTarget(null)}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "dashboard" | "reviews" | "reports";

export function AdminReviewsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "dashboard",
      label: "Tổng quan",
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: "reviews",
      label: "Đánh giá",
      icon: <Star className="w-4 h-4" />,
    },
    {
      id: "reports",
      label: "Báo cáo vi phạm",
      icon: <Flag className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
          Quản lý Đánh giá
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Tổng quan, duyệt và phản hồi đánh giá dịch vụ.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "dashboard" && <DashboardTab />}
      {activeTab === "reviews" && <ReviewsTab />}
      {activeTab === "reports" && <ReportsTab />}
    </div>
  );
}
