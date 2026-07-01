"use client";

import React, { useState, useMemo } from "react";
import {
  Star, MessageSquare, Loader2, Inbox,
  ChevronLeft, ChevronRight, SlidersHorizontal,
  ArrowUpDown, MessageCircleReply, Filter,
} from "lucide-react";
import { usePackageReviews } from "@/features/customer/history/hooks/useReview";

interface PackageReviewsTabProps {
  packageId: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

type SortKey = "newest" | "oldest" | "highest" | "lowest";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest",  label: "Mới nhất"   },
  { key: "oldest",  label: "Cũ nhất"    },
  { key: "highest", label: "Điểm cao"   },
  { key: "lowest",  label: "Điểm thấp"  },
];

const SUB_LABELS: Record<string, string> = {
  punctuality:  "Đúng giờ",
  cleanliness:  "Sạch sẽ",
  friendliness: "Thân thiện",
  satisfaction: "Hài lòng",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "w-5 h-5" : size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${cls} ${i < Math.round(rating) ? "text-(--c-primary) fill-(--c-primary)" : "text-(--c-muted)/30"}`}
        />
      ))}
    </div>
  );
}

function Avatar({ name, src }: { name: string | null; src: string | null }) {
  const letter = name?.[0]?.toUpperCase() ?? "K";
  const colors = ["bg-violet-100 text-violet-600", "bg-blue-100 text-blue-600", "bg-emerald-100 text-emerald-600", "bg-(--c-primary-soft) text-(--c-primary-strong)", "bg-rose-100 text-rose-600"];
  const color = colors[(letter.charCodeAt(0) ?? 0) % colors.length];
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden ${src ? "" : color}`}>
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : letter}
    </div>
  );
}

// Numbered pagination
function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null;

  const pages: (number | "...")[] = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(total - 1, page + 1); i++) pages.push(i);
    if (page < total - 2) pages.push("...");
    pages.push(total);
  }

  const btn = (label: React.ReactNode, active: boolean, disabled: boolean, onClick: () => void, key: React.Key) => (
    <button
      key={key}
      onClick={onClick}
      disabled={disabled}
      className={[
        "min-w-[36px] h-9 px-3 rounded-xl text-sm font-bold transition-all border",
        active
          ? "bg-(--c-primary-strong) text-white border-transparent shadow-sm"
          : disabled
          ? "text-(--c-muted)/40 border-(--c-line)/30 cursor-not-allowed"
          : "text-(--c-muted) border-(--c-line)/50 hover:text-(--c-ink) hover:border-(--c-line) bg-(--c-card-2)",
      ].join(" ")}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center justify-center gap-1.5 mt-6">
      {btn(<ChevronLeft className="w-4 h-4" />, false, page <= 1, () => onChange(page - 1), "prev")}
      {pages.map((p, i) =>
        p === "..."
          ? <span key={`ellipsis-${i}`} className="px-1 text-(--c-muted) text-sm select-none">…</span>
          : btn(p, p === page, false, () => onChange(p as number), p)
      )}
      {btn(<ChevronRight className="w-4 h-4" />, false, page >= total, () => onChange(page + 1), "next")}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PackageReviewsTab({ packageId }: PackageReviewsTabProps) {
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const [sort, setSort] = useState<SortKey>("newest");
  const [replyOnly, setReplyOnly] = useState(false);
  const [page, setPage] = useState(1);

  // Fetch up to 200 reviews for client-side filtering
  const { data, isLoading } = usePackageReviews(packageId, 1, 200);

  const avgRating    = data?.avgRating    ?? 0;
  const totalReviews = data?.totalReviews ?? 0;
  const distribution = data?.distribution ?? [];

  // ── Client-side filter + sort ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...(data?.items ?? [])];
    if (starFilter !== null) list = list.filter(r => Math.round(r.overallRating) === starFilter);
    if (replyOnly)           list = list.filter(r => !!r.adminReply);
    switch (sort) {
      case "newest":  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      case "oldest":  list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break;
      case "highest": list.sort((a, b) => b.overallRating - a.overallRating); break;
      case "lowest":  list.sort((a, b) => a.overallRating - b.overallRating); break;
    }
    return list;
  }, [data?.items, starFilter, sort, replyOnly]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetPage = () => setPage(1);

  const isFiltered = starFilter !== null || replyOnly || sort !== "newest";

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-(--c-ink) flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-(--c-primary-soft)">
              <Star className="w-5 h-5 text-(--c-primary) fill-(--c-primary)" />
            </span>
            Đánh giá khách hàng
          </h3>
          <p className="text-sm text-(--c-muted) mt-1 pl-11">
            Tổng hợp phản hồi từ khách hàng đã sử dụng gói dịch vụ này
          </p>
        </div>

        {totalReviews > 0 && (
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-(--c-primary-soft) border border-(--c-primary)/20 self-start sm:self-auto shrink-0">
            <Star className="w-6 h-6 text-(--c-primary) fill-(--c-primary)" />
            <div>
              <p className="text-3xl font-black text-(--c-primary-strong) leading-none">{avgRating.toFixed(1)}</p>
              <p className="text-xs text-(--c-primary-strong)/70 font-semibold mt-0.5">/5 · {totalReviews} đánh giá</p>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-(--c-primary-strong)" />
        </div>
      ) : totalReviews === 0 ? (
        <div className="flex flex-col items-center py-20 gap-4 border-2 border-dashed border-(--c-line) rounded-2xl bg-(--c-card-2)">
          <div className="w-16 h-16 rounded-2xl bg-(--c-card) flex items-center justify-center shadow-sm">
            <Inbox className="w-8 h-8 text-(--c-muted)/50" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-(--c-muted)">Chưa có đánh giá nào</p>
            <p className="text-xs text-(--c-muted) mt-1">Gói dịch vụ chưa nhận được phản hồi từ khách hàng</p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Rating Distribution ── */}
          <div className="bg-(--c-card) border border-(--c-line)/50 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row items-start gap-8">
              {/* Big score */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <p className="text-6xl font-black text-(--c-primary) leading-none">{avgRating.toFixed(1)}</p>
                <StarRow rating={avgRating} size="md" />
                <p className="text-xs text-(--c-muted) font-medium mt-0.5">{totalReviews} đánh giá</p>
              </div>

              {/* Bars */}
              <div className="flex-1 w-full space-y-2.5">
                {[...distribution].sort((a, b) => b.stars - a.stars).map((d) => (
                  <button
                    key={d.stars}
                    onClick={() => {
                      setStarFilter(starFilter === d.stars ? null : d.stars);
                      resetPage();
                    }}
                    className={`w-full flex items-center gap-3 group transition-all rounded-xl px-2 py-1 -mx-2 ${
                      starFilter === d.stars ? "bg-(--c-primary-soft)" : "hover:bg-(--c-card-2)"
                    }`}
                  >
                    <div className="flex items-center gap-1 w-[72px] shrink-0">
                      {Array.from({ length: d.stars }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 text-(--c-primary) fill-(--c-primary)" />
                      ))}
                    </div>
                    <div className="flex-1 h-3 bg-(--c-card-2) rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          starFilter === d.stars ? "bg-(--c-primary-strong)" : "bg-(--c-primary)"
                        }`}
                        style={{ width: `${d.pct}%` }}
                      />
                    </div>
                    <span className={`text-xs w-5 text-right font-bold shrink-0 ${
                      starFilter === d.stars ? "text-(--c-primary-strong)" : "text-(--c-muted)"
                    }`}>
                      {d.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Filter bar ── */}
          <div className="bg-(--c-card) border border-(--c-line)/50 rounded-2xl px-5 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
              {/* Star filter chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Filter className="w-3.5 h-3.5 text-(--c-muted) shrink-0" />
                <button
                  onClick={() => { setStarFilter(null); resetPage(); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    starFilter === null
                      ? "bg-(--c-primary-strong) text-white border-transparent shadow-sm"
                      : "text-(--c-muted) border-(--c-line)/50 bg-(--c-card-2) hover:text-(--c-ink)"
                  }`}
                >
                  Tất cả
                </button>
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = distribution.find(d => d.stars === star)?.count ?? 0;
                  return (
                    <button
                      key={star}
                      onClick={() => { setStarFilter(starFilter === star ? null : star); resetPage(); }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        starFilter === star
                          ? "bg-(--c-primary-strong) text-white border-transparent shadow-sm"
                          : "text-(--c-muted) border-(--c-line)/50 bg-(--c-card-2) hover:text-(--c-ink)"
                      }`}
                    >
                      <Star className="w-3 h-3 fill-current" />
                      {star}
                      {count > 0 && (
                        <span className={`ml-0.5 ${starFilter === star ? "text-white/80" : "text-(--c-muted)"}`}>
                          ({count})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
                {/* Has reply filter */}
                <button
                  onClick={() => { setReplyOnly(!replyOnly); resetPage(); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    replyOnly
                      ? "bg-(--c-primary-strong) text-white border-transparent shadow-sm"
                      : "text-(--c-muted) border-(--c-line)/50 bg-(--c-card-2) hover:text-(--c-ink)"
                  }`}
                >
                  <MessageCircleReply className="w-3.5 h-3.5" />
                  Có phản hồi
                </button>

                {/* Sort */}
                <div className="flex items-center gap-1.5 bg-(--c-card-2) rounded-xl px-1 py-1">
                  <ArrowUpDown className="w-3.5 h-3.5 text-(--c-muted) ml-1.5 shrink-0" />
                  {SORT_OPTIONS.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => { setSort(s.key); resetPage(); }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        sort === s.key
                          ? "bg-(--c-card) text-(--c-primary-strong) shadow-sm"
                          : "text-(--c-muted) hover:text-(--c-ink)"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Active filter summary */}
            {isFiltered && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-(--c-line)/30">
                <span className="text-xs text-(--c-muted)">
                  Đang lọc: <span className="font-semibold text-(--c-ink)">{filtered.length}</span> / {totalReviews} đánh giá
                </span>
                <button
                  onClick={() => { setStarFilter(null); setSort("newest"); setReplyOnly(false); resetPage(); }}
                  className="text-xs text-(--c-primary-strong) font-semibold hover:underline"
                >
                  Xóa bộ lọc
                </button>
              </div>
            )}
          </div>

          {/* ── Reviews list ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-(--c-ink) flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-(--c-primary-strong)" />
                Nhận xét{starFilter ? ` ${starFilter} sao` : " gần đây"}
              </h4>
              {filtered.length > 0 && (
                <span className="text-xs text-(--c-muted) font-medium">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length}
                </span>
              )}
            </div>

            {pageItems.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-3 border border-dashed border-(--c-line) rounded-2xl bg-(--c-card-2)">
                <Inbox className="w-10 h-10 text-(--c-muted)/40" />
                <p className="text-sm text-(--c-muted)">Không có đánh giá nào phù hợp với bộ lọc</p>
                <button
                  onClick={() => { setStarFilter(null); setSort("newest"); setReplyOnly(false); resetPage(); }}
                  className="text-xs text-(--c-primary-strong) font-semibold hover:underline"
                >
                  Xóa bộ lọc
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {pageItems.map((review) => {
                  const subRatings = [
                    { key: "punctuality",  val: review.punctuality  },
                    { key: "cleanliness",  val: review.cleanliness  },
                    { key: "friendliness", val: review.friendliness },
                    { key: "satisfaction", val: review.satisfaction },
                  ].filter(s => s.val && s.val > 0);

                  return (
                    <div
                      key={review.id}
                      className="bg-(--c-card) border border-(--c-line)/50 rounded-2xl p-5 hover:border-(--c-primary)/20 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <Avatar name={review.customerName} src={review.avatar} />

                        <div className="flex-1 min-w-0">
                          {/* Top row */}
                          <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                            <div>
                              <p className="font-bold text-(--c-ink) text-sm leading-none">
                                {review.customerName ?? "Ẩn danh"}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <StarRow rating={review.overallRating} size="sm" />
                                <span className="text-xs font-bold text-(--c-primary-strong)">{review.overallRating.toFixed(1)}</span>
                              </div>
                            </div>
                            <span className="text-xs text-(--c-muted) shrink-0 font-medium">{fmtDate(review.createdAt)}</span>
                          </div>

                          {/* Sub-ratings chips */}
                          {subRatings.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {subRatings.map((s) => (
                                <div key={s.key} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-(--c-card-2) border border-(--c-line)/40">
                                  <span className="text-[10px] text-(--c-muted) font-medium">{SUB_LABELS[s.key]}</span>
                                  <div className="flex gap-0.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star key={i} className={`w-2.5 h-2.5 ${i < Math.round(s.val!) ? "text-(--c-primary) fill-(--c-primary)" : "text-(--c-muted)/20"}`} />
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Comment */}
                          {review.comment && (
                            <p className="text-sm text-(--c-ink) leading-relaxed">{review.comment}</p>
                          )}

                          {/* Images */}
                          {review.images && review.images.length > 0 && (
                            <div className="flex gap-2 mt-3 flex-wrap">
                              {review.images.slice(0, 5).map((img, i) => (
                                <img key={i} src={img} alt="" className="w-16 h-16 rounded-xl object-cover border border-(--c-line)/40" />
                              ))}
                              {review.images.length > 5 && (
                                <div className="w-16 h-16 rounded-xl bg-(--c-card-2) border border-(--c-line)/40 flex items-center justify-center">
                                  <span className="text-xs font-bold text-(--c-muted)">+{review.images.length - 5}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Admin reply */}
                          {review.adminReply && (
                            <div className="mt-3 bg-(--c-primary-soft) border border-(--c-primary)/15 rounded-xl px-4 py-3">
                              <p className="text-xs font-bold text-(--c-primary-strong) mb-1 flex items-center gap-1.5">
                                <MessageCircleReply className="w-3.5 h-3.5" />
                                Phản hồi từ CleanZ
                              </p>
                              <p className="text-xs text-(--c-ink) leading-relaxed">{review.adminReply}</p>
                            </div>
                          )}

                          {/* Tasker reply */}
                          {review.taskerReply && (
                            <div className="mt-2 bg-[rgba(99,102,241,0.06)] border border-[#6366F1]/15 rounded-xl px-4 py-3">
                              <p className="text-xs font-bold text-[#6366F1] mb-1 flex items-center gap-1.5">
                                <MessageCircleReply className="w-3.5 h-3.5" />
                                Phản hồi từ Tasker
                              </p>
                              <p className="text-xs text-(--c-ink) leading-relaxed">{review.taskerReply}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            <Pagination page={page} total={totalPages} onChange={setPage} />

            {totalPages > 1 && (
              <p className="text-center text-xs text-(--c-muted) mt-3">
                Trang {page} / {totalPages} · {filtered.length} đánh giá
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
