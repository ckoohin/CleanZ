"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { HeadphonesIcon, Plus, ChevronRight, ArrowLeft, ImagePlus, X, AlertCircle, Clock } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useMyTicketInfiniteList, useCreateTicket, useMyBookings, useMyTicketUnreadRealtime } from "@/features/support-tickets/hooks/useMyTicket";
import { myTicketApi } from "@/features/support-tickets/services/my-ticket.service";
import { toast } from "@/lib/toast";
import type {
  MyTicketSummary,
  TicketStatus,
  TicketCategory,
  CreateTicketDto,
} from "@/features/support-tickets/types/my-ticket.types";
import {
  categoryOptionsFor,
  categoryLabelFor,
  pendingHintFor,
  STATUS_LABEL,
  STATUS_TONE,
  PRIORITY_LABEL,
  TONE_BADGE_CLASS,
} from "@/features/support-tickets/shared/ticket.labels";
import { NO_BOOKING_CATEGORIES } from "@/features/support-tickets/shared/ticket.enums";
import { useAuth } from "@/features/auth/hooks/auth.hooks";

/** Vai của người đang dùng màn hình này (customer app vs tasker app). */
type ViewerRole = "CUSTOMER" | "TASKER";

/** Ẩn scrollbar nhưng vẫn cuộn được (hàng tab trạng thái cuộn ngang). */
const SCROLLBAR_HIDDEN =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

function CreateTicketSheet({
  open,
  onClose,
  viewerRole,
}: {
  open: boolean;
  onClose: () => void;
  viewerRole: ViewerRole;
}) {
  const createTicket = useCreateTicket();
  const searchParams = useSearchParams();
  const { data: bookings, isLoading: bookingsLoading } = useMyBookings(open);
  const [images, setImages] = useState<{ file: File; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<{
    category: TicketCategory | "";
    subject: string;
    description: string;
    bookingId: string;
  }>({ category: "", subject: "", description: "", bookingId: "" });

  // Tự động điền dữ liệu từ URL query params khi Modal được mở
  React.useEffect(() => {
    if (open) {
      const urlBookingId = searchParams.get("bookingId") ?? "";
      const urlCategory = searchParams.get("category") ?? "";
      const urlSubject = searchParams.get("subject") ?? "";
      const urlDescription = searchParams.get("description") ?? "";

      if (urlBookingId || urlCategory || urlSubject || urlDescription) {
        setForm({
          bookingId: urlBookingId,
          category: (urlCategory as TicketCategory) || "",
          subject: urlSubject,
          description: urlDescription,
        });
      }
    }
  }, [open, searchParams]);

  // Giữ blob URL cùng file để thu hồi được (gọi createObjectURL thẳng trong JSX
  // sẽ sinh blob mới mỗi lần re-render và không bao giờ giải phóng).
  useEffect(
    () => () => images.forEach((p) => URL.revokeObjectURL(p.url)),
    [images],
  );

  const addImages = (files: FileList | null) => {
    if (!files) return;
    const chosen = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setImages((prev) => {
      const room = 5 - prev.length;
      return [
        ...prev,
        ...chosen
          .slice(0, Math.max(0, room))
          .map((file) => ({ file, url: URL.createObjectURL(file) })),
      ];
    });
  };
  const removeImage = (idx: number) =>
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });

  // Loại vấn đề lọc theo vai: tasker không tự khiếu nại chất lượng/hành vi của
  // chính mình. Nhãn cũng đổi theo vai cho khỏi hiểu ngược chiều.
  const categoryOptions = React.useMemo(
    () =>
      categoryOptionsFor(viewerRole).map((o) => ({
        ...o,
        label: categoryLabelFor(o.value, viewerRole),
      })),
    [viewerRole],
  );

  // Đổi vai (hiếm, nhưng có thể xảy ra khi chuyển tài khoản) mà category đang
  // chọn không còn hợp lệ → bỏ chọn để không gửi lên loại bị ẩn.
  React.useEffect(() => {
    if (form.category && !categoryOptions.some((o) => o.value === form.category)) {
      setForm((p) => ({ ...p, category: "", bookingId: "" }));
    }
  }, [categoryOptions, form.category]);

  // bookingId bắt buộc trừ category ∈ {ACCOUNT_TECHNICAL, OTHER} (spec §1.1)
  const requiresBooking =
    !!form.category && !NO_BOOKING_CATEGORIES.includes(form.category as TicketCategory);
  const bookingOk = !!form.category && (!requiresBooking || !!form.bookingId.trim());
  const canSubmit =
    form.category && form.subject.trim() && form.description.trim() && bookingOk;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    // 1) Tạo ticket → 2) upload ảnh vào ticket vừa tạo (BE chỉ có /:id/attachments)
    const created = await createTicket.mutateAsync({
      category: form.category as TicketCategory,
      subject: form.subject.trim(),
      description: form.description.trim(),
      bookingId: form.bookingId.trim() || undefined,
    } as CreateTicketDto);

    if (images.length > 0 && created?.id) {
      setUploading(true);
      // Tải SONG SONG: vòng lặp await tuần tự khiến 5 ảnh phải chờ 5 lượt
      // round-trip nối đuôi nhau. `allSettled` để một ảnh hỏng không chặn ảnh
      // còn lại, rồi báo đúng số ảnh thất bại.
      const results = await Promise.allSettled(
        images.map((p) => myTicketApi.uploadAttachment(created.id, p.file)),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        toast.error(
          `Tạo yêu cầu thành công nhưng ${failed}/${images.length} ảnh tải lên thất bại`,
        );
      }
      setUploading(false);
    }

    onClose();
    setForm({ category: "", subject: "", description: "", bookingId: "" });
    images.forEach((p) => URL.revokeObjectURL(p.url));
    setImages([]);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl max-h-[90vh] overflow-y-auto"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>

            <div className="px-5 pb-8">
              <h2 className="text-xl font-bold text-foreground mb-1">Gửi yêu cầu hỗ trợ</h2>
              <p className="text-sm text-muted-foreground mb-5">Mô tả vấn đề của bạn, chúng tôi sẽ phản hồi sớm nhất.</p>

              <div className="space-y-4">
                {/* Category */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Loại vấn đề *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {categoryOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            category: opt.value,
                            bookingId: NO_BOOKING_CATEGORIES.includes(opt.value)
                              ? ""
                              : p.bookingId,
                          }))
                        }
                        className={`py-3 px-4 rounded-xl text-sm font-semibold text-left border transition-all ${
                          form.category === opt.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-foreground/70 hover:border-primary/50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Tiêu đề *
                  </label>
                  <input
                    type="text"
                    maxLength={255}
                    placeholder="Mô tả ngắn vấn đề..."
                    value={form.subject}
                    onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Mô tả chi tiết *
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  />
                </div>

                {/* Đơn liên quan — chỉ hiện khi loại vấn đề cần gắn đơn */}
                {requiresBooking && (
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                      Đơn liên quan *
                    </label>
                    <select
                      value={form.bookingId}
                      onChange={(e) => setForm((p) => ({ ...p, bookingId: e.target.value }))}
                      disabled={bookingsLoading}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
                    >
                      <option value="">
                        {bookingsLoading ? "Đang tải đơn..." : "-- Chọn đơn liên quan --"}
                      </option>
                      {(bookings ?? []).map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bookingCode ?? b.id.slice(0, 8)}
                          {b.serviceName ? ` · ${b.serviceName}` : ""}
                          {b.scheduledStart
                            ? ` · ${new Date(b.scheduledStart).toLocaleDateString("vi-VN")}`
                            : ""}
                        </option>
                      ))}
                    </select>
                    {!bookingsLoading && (bookings?.length ?? 0) === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Bạn chưa có đơn nào để chọn.
                      </p>
                    )}
                  </div>
                )}

                {/* Hình ảnh đính kèm (tuỳ chọn) */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Hình ảnh đính kèm (tối đa 5)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {images.map((p, idx) => (
                      <div key={p.url} className="relative size-16 overflow-hidden rounded-xl border border-border/50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt="đính kèm" className="size-full object-cover" />
                        <button
                          type="button"
                          aria-label="Xoá ảnh"
                          onClick={() => removeImage(idx)}
                          className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                    {images.length < 5 && (
                      <label className="flex size-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary">
                        <ImagePlus className="size-4" />
                        <span className="text-[10px]">Thêm</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg"
                          multiple
                          className="hidden"
                          onChange={(e) => addImages(e.target.files)}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || createTicket.isPending || uploading}
                  className="w-full py-4 bg-primary text-white font-bold rounded-2xl text-sm shadow-lg shadow-primary/30 hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {createTicket.isPending || uploading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <HeadphonesIcon className="w-4 h-4" />
                      Gửi yêu cầu hỗ trợ
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Ticket Card ──────────────────────────────────────────────────────────────
function TicketCard({
  ticket,
  viewerRole,
  onClick,
}: {
  ticket: MyTicketSummary;
  viewerRole: ViewerRole;
  onClick: () => void;
}) {
  // Ticket nhắm VÀO người xem — cần nổi bật vì đây là loại cần họ phản hồi.
  const isAboutMe = ticket.myRole === "COUNTERPARTY";
  // "Tạm chờ" mà không nói chờ AI thì vô dụng — làm rõ bóng đang ở sân ai.
  const pendingHint =
    ticket.status === "PENDING"
      ? pendingHintFor(ticket.pendingReason, ticket.awaitingMe)
      : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-card rounded-2xl border border-border/50 p-4 shadow-sm cursor-pointer hover:border-primary/30 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Code + vai + priority */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            {ticket.ticketCode && (
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                {ticket.ticketCode}
              </span>
            )}
            {ticket.myRole && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                  isAboutMe
                    ? "text-amber-700 dark:text-amber-400 bg-amber-500/10"
                    : "text-muted-foreground bg-muted"
                }`}
              >
                {isAboutMe ? "Về bạn" : "Bạn gửi"}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
              {PRIORITY_LABEL[ticket.priority]}
            </span>
            {ticket.slaBreached && (
              <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-md">
                SLA
              </span>
            )}
          </div>

          <h3 className="font-semibold text-sm text-foreground line-clamp-1">{ticket.subject}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {categoryLabelFor(ticket.category, viewerRole)}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {!!ticket.unreadCount && ticket.unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-white shadow-sm">
              {ticket.unreadCount > 9 ? "9+" : ticket.unreadCount}
            </span>
          )}
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${TONE_BADGE_CLASS[STATUS_TONE[ticket.status]]}`}
          >
            {STATUS_LABEL[ticket.status]}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {new Date(ticket.updatedAt).toLocaleDateString("vi-VN")}
          </span>
        </div>
      </div>

      {pendingHint && (
        <div
          className={`mt-2.5 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
            pendingHint.urgent
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {pendingHint.urgent ? (
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <Clock className="h-3.5 w-3.5 shrink-0" />
          )}
          {pendingHint.text}
        </div>
      )}

      <div className="flex items-center justify-end mt-3 pt-3 border-t border-border/30">
        <span className="text-xs text-primary font-semibold flex items-center gap-0.5">
          {!!ticket.unreadCount && ticket.unreadCount > 0
            ? `${ticket.unreadCount} tin mới`
            : "Xem chi tiết"}{" "}
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
/**
 * Tab trạng thái — phủ ĐỦ 5 trạng thái của vòng đời. Trước đây thiếu `NEW` và
 * `PENDING`: ticket vừa gửi (NEW) hoặc đang chờ chính người dùng phản hồi
 * (PENDING — trạng thái cần họ hành động nhất) chỉ lọt vào mục "Tất cả".
 * BE chỉ nhận MỘT `status` nên mỗi tab ánh xạ 1-1, không gộp nhóm.
 */
type FilterTab = "ALL" | TicketStatus;
/** Phạm vi: tất cả / ticket tôi gửi / khiếu nại nhắm vào tôi. */
type ScopeTab = "ALL" | "reporter" | "counterparty";

interface MyTicketListPageProps {
  /**
   * Base path danh sách (string — an toàn khi truyền từ Server Component).
   * URL chi tiết = `${basePath}/${id}`. Dùng để tái dùng cho cả Customer & Tasker.
   */
  basePath?: string;
}

export const MyTicketListPage: React.FC<MyTicketListPageProps> = ({
  basePath = ROUTES.CUSTOMER.SUPPORT_TICKETS,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [scope, setScope] = useState<ScopeTab>("ALL");
  const [showCreate, setShowCreate] = useState(false);
  useMyTicketUnreadRealtime(); // tin mới → badge ngoài ticket cập nhật tức thì

  const { data: me } = useAuth();
  const viewerRole: ViewerRole = me?.role === "TASKER" ? "TASKER" : "CUSTOMER";

  // Tự động mở Modal tạo mới nếu phát hiện có tham số khiếu nại đơn từ URL
  React.useEffect(() => {
    const hasParams = searchParams.get("bookingId") || searchParams.get("category");
    if (hasParams) {
      setShowCreate(true);
    }
  }, [searchParams]);

  const statusFilter: TicketStatus | undefined =
    activeTab === "ALL" ? undefined : activeTab;

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMyTicketInfiniteList({
    ...(statusFilter && { status: statusFilter }),
    ...(scope !== "ALL" && { role: scope }),
  });

  // Gộp các trang đã tải; `total` lấy ở trang đầu để hiện "đã xem X/Y".
  const tickets = React.useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  );
  const total = data?.pages[0]?.meta.total ?? 0;
  const isFiltering = activeTab !== "ALL" || scope !== "ALL";

  // Tự tải trang kế khi chạm đáy (rootMargin để nạp TRƯỚC khi người dùng thấy
  // khoảng trống). Nút "Xem thêm" bên dưới là đường dự phòng khi IO không chạy.
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasNextPage || isFetchingNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void fetchNextPage();
      },
      { rootMargin: "240px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Ánh xạ 1-1 với TicketStatus — đủ vòng đời, không gộp nhóm.
  const tabs: { key: FilterTab; label: string }[] = [
    { key: "ALL", label: "Tất cả" },
    { key: "NEW", label: STATUS_LABEL.NEW },
    { key: "IN_PROGRESS", label: STATUS_LABEL.IN_PROGRESS },
    { key: "PENDING", label: STATUS_LABEL.PENDING },
    { key: "RESOLVED", label: STATUS_LABEL.RESOLVED },
    { key: "CLOSED", label: STATUS_LABEL.CLOSED },
  ];

  const scopeTabs: { key: ScopeTab; label: string }[] = [
    { key: "ALL", label: "Tất cả" },
    { key: "reporter", label: "Tôi gửi" },
    {
      key: "counterparty",
      label: viewerRole === "TASKER" ? "Khiếu nại về tôi" : "Liên quan tới tôi",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card px-4 pt-[max(3rem,env(safe-area-inset-top))] pb-4 shadow-sm sticky top-0 z-20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-xl font-bold text-foreground">Yêu cầu hỗ trợ</h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-3 py-2 rounded-xl shadow-md shadow-primary/25"
          >
            <Plus className="w-3.5 h-3.5" /> Tạo mới
          </button>
        </div>

        {/* Phạm vi: tôi gửi vs nhắm vào tôi (BE: ?role=reporter|counterparty) */}
        <div className="mb-2 flex gap-1.5 overflow-x-auto">
          {scopeTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setScope(t.key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                scope === t.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter Tabs — 6 mục nên cuộn ngang thay vì chia đều (chữ bị vỡ dòng) */}
        <div
          className={`flex gap-1 rounded-xl bg-muted p-1 overflow-x-auto ${SCROLLBAR_HIDDEN}`}
          role="tablist"
          aria-label="Lọc theo trạng thái"
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                activeTab === tab.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border/50 p-4 h-28 animate-pulse" />
          ))
        ) : tickets.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <HeadphonesIcon className="w-8 h-8 text-primary" />
            </div>
            {/* Rỗng do BỘ LỌC khác hẳn rỗng do CHƯA CÓ ticket nào — không mời
                "tạo yêu cầu đầu tiên" với người đang lọc mà đã có ticket khác. */}
            {isFiltering ? (
              <>
                <h3 className="font-bold text-foreground mb-1">
                  Không có yêu cầu nào ở mục này
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs mb-6">
                  Thử chọn mục khác hoặc xem tất cả yêu cầu của bạn.
                </p>
                <button
                  onClick={() => {
                    setActiveTab("ALL");
                    setScope("ALL");
                  }}
                  className="rounded-2xl border border-border px-6 py-3 text-sm font-bold text-foreground"
                >
                  Xoá bộ lọc
                </button>
              </>
            ) : (
              <>
                <h3 className="font-bold text-foreground mb-1">Chưa có yêu cầu nào</h3>
                <p className="text-sm text-muted-foreground max-w-xs mb-6">
                  Nếu bạn gặp vấn đề, hãy tạo yêu cầu hỗ trợ — chúng tôi sẽ phản hồi sớm nhất!
                </p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 bg-primary text-white font-bold px-6 py-3 rounded-2xl shadow-md shadow-primary/25"
                >
                  <Plus className="w-4 h-4" /> Tạo yêu cầu đầu tiên
                </button>
              </>
            )}
          </motion.div>
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              {tickets.map((ticket, index) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  // Chỉ trễ theo thứ tự TRONG TRANG ĐẦU — trang tải thêm hiện
                  // ngay, tránh chờ dồn khi danh sách đã dài.
                  transition={{ delay: Math.min(index, 5) * 0.05 }}
                >
                  <TicketCard
                    ticket={ticket}
                    viewerRole={viewerRole}
                    onClick={() => router.push(`${basePath}/${ticket.id}`)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Mốc kích hoạt tải trang kế + nút dự phòng */}
            <div ref={loadMoreRef} className="pt-1">
              {isFetchingNextPage ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-28 animate-pulse rounded-2xl border border-border/50 bg-card"
                    />
                  ))}
                </div>
              ) : hasNextPage ? (
                <button
                  onClick={() => void fetchNextPage()}
                  className="w-full rounded-2xl border border-border bg-card py-3 text-sm font-bold text-primary"
                >
                  Xem thêm
                </button>
              ) : (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  Đã hiển thị tất cả {total} yêu cầu
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Create Sheet */}
      <CreateTicketSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        viewerRole={viewerRole}
      />
    </div>
  );
};
