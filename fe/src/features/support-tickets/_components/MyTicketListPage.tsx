"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
  HeadphonesIcon,
  Plus,
  ChevronRight,
  ArrowLeft,
  ImagePlus,
  X,
  AlertCircle,
  Clock,
  Check,
  Inbox,
  SlidersHorizontal,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
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
  type Tone,
} from "@/features/support-tickets/shared/ticket.labels";
import {
  CATEGORY_ICON,
  categoryHintFor,
  OTHER_CATEGORY_HINT,
} from "@/features/support-tickets/shared/ticket.category-meta";
import { NO_BOOKING_CATEGORIES } from "@/features/support-tickets/shared/ticket.enums";
import { useAuth } from "@/features/auth/hooks/auth.hooks";

/** Vai của người đang dùng màn hình này (customer app vs tasker app). */
type ViewerRole = "CUSTOMER" | "TASKER";

/** Ẩn scrollbar nhưng vẫn cuộn được (hàng tab trạng thái cuộn ngang). */
const SCROLLBAR_HIDDEN =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

/**
 * Vạch màu dọc bên trái card, đọc được trạng thái ticket chỉ bằng liếc mắt mà
 * không phải tìm badge. Tách khỏi `TONE_BADGE_CLASS` (badge có nền + viền nhạt)
 * vì ở đây cần MÀU ĐẶC mới thấy trên dải 3px.
 */
const TONE_BAR_CLASS: Record<Tone, string> = {
  neutral: "bg-foreground/25",
  info: "bg-primary",
  warning: "bg-amber-500",
  success: "bg-emerald-500",
  muted: "bg-border",
};

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

  // "Khác" tách khỏi lưới: nó là lối thoát khi không loại nào khớp, nên phải
  // thấy được NGAY sau khi đã lướt hết các loại cụ thể — nằm lẫn trong lưới thì
  // vừa dễ bị chọn nhầm cho tiện, vừa dễ bị bỏ sót khi thật sự cần.
  const gridOptions = categoryOptions.filter((o) => o.value !== "OTHER");
  const otherOption = categoryOptions.find((o) => o.value === "OTHER");

  // Đổi vai (hiếm, nhưng có thể xảy ra khi chuyển tài khoản) mà category đang
  // chọn không còn hợp lệ → bỏ chọn để không gửi lên loại bị ẩn.
  React.useEffect(() => {
    if (form.category && !categoryOptions.some((o) => o.value === form.category)) {
      setForm((p) => ({ ...p, category: "", bookingId: "" }));
    }
  }, [categoryOptions, form.category]);

  const pickCategory = (value: TicketCategory) =>
    setForm((p) => ({
      ...p,
      category: value,
      bookingId: NO_BOOKING_CATEGORIES.includes(value) ? "" : p.bookingId,
    }));

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

  const fieldClass =
    "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";
  const labelClass =
    "mb-2 block text-xs font-bold uppercase tracking-wide text-muted-foreground";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 flex max-h-[92vh] flex-col rounded-t-3xl bg-card shadow-2xl",
              SCROLLBAR_HIDDEN,
            )}
          >
            {/* Handle + tiêu đề dính trên: cuộn form dài vẫn biết đang ở đâu */}
            <div className="shrink-0 rounded-t-3xl border-b border-border/40 bg-card px-5 pb-4 pt-3">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <HeadphonesIcon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-foreground">
                    Gửi yêu cầu hỗ trợ
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Mô tả vấn đề của bạn, chúng tôi sẽ phản hồi sớm nhất.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Đóng"
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className={cn("flex-1 overflow-y-auto px-5 pb-8 pt-5", SCROLLBAR_HIDDEN)}>
              <div className="space-y-5">
                {/* Category */}
                <div>
                  <label className={labelClass}>Loại vấn đề *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {gridOptions.map((opt) => {
                      const Icon = CATEGORY_ICON[opt.value];
                      const selected = form.category === opt.value;
                      const hint = categoryHintFor(opt.value, viewerRole);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => pickCategory(opt.value)}
                          className={cn(
                            "flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-all active:scale-[0.98]",
                            selected
                              ? "border-primary bg-primary/10 ring-2 ring-primary/25"
                              : "border-border bg-background hover:border-primary/40",
                          )}
                        >
                          <Icon
                            className={cn(
                              "size-4 shrink-0",
                              selected ? "text-primary" : "text-muted-foreground",
                            )}
                          />
                          <span
                            className={cn(
                              "text-sm font-semibold leading-tight",
                              selected ? "text-primary" : "text-foreground",
                            )}
                          >
                            {opt.label}
                          </span>
                          {hint && (
                            <span className="text-[10px] leading-tight text-muted-foreground">
                              {hint}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* "Khác" — lối thoát cuối, tách hẳn khỏi lưới và chiếm trọn
                      chiều ngang để không bị nhìn ngang hàng với loại cụ thể. */}
                  {otherOption && (
                    <>
                      <div className="my-3 flex items-center gap-3">
                        <span className="h-px flex-1 bg-border/70" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Không thấy loại phù hợp?
                        </span>
                        <span className="h-px flex-1 bg-border/70" />
                      </div>
                      <button
                        type="button"
                        aria-pressed={form.category === "OTHER"}
                        onClick={() => pickCategory("OTHER")}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition-all active:scale-[0.99]",
                          form.category === "OTHER"
                            ? "border-primary bg-primary/10 ring-2 ring-primary/25"
                            : "border-dashed border-primary/40 bg-primary/[0.04] hover:border-primary/70 hover:bg-primary/10",
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                            form.category === "OTHER"
                              ? "bg-primary text-white"
                              : "bg-primary/15 text-primary",
                          )}
                        >
                          {React.createElement(CATEGORY_ICON.OTHER, {
                            className: "size-5",
                          })}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-primary">
                            {otherOption.label}
                          </p>
                          <p className="text-[11px] leading-snug text-muted-foreground">
                            {OTHER_CATEGORY_HINT}
                          </p>
                        </div>
                        {form.category === "OTHER" && (
                          <Check className="size-5 shrink-0 text-primary" />
                        )}
                      </button>
                    </>
                  )}
                </div>

                {/* Subject */}
                <div>
                  <div className="flex items-baseline justify-between">
                    <label className={labelClass}>Tiêu đề *</label>
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {form.subject.length}/255
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={255}
                    placeholder="Mô tả ngắn vấn đề..."
                    value={form.subject}
                    onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                    className={fieldClass}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className={labelClass}>Mô tả chi tiết *</label>
                  <textarea
                    rows={4}
                    placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    className={cn(fieldClass, "resize-none")}
                  />
                </div>

                {/* Đơn liên quan — chỉ hiện khi loại vấn đề cần gắn đơn */}
                {requiresBooking && (
                  <div>
                    <label className={labelClass}>Đơn liên quan *</label>
                    <select
                      value={form.bookingId}
                      onChange={(e) => setForm((p) => ({ ...p, bookingId: e.target.value }))}
                      disabled={bookingsLoading}
                      className={cn(fieldClass, "disabled:opacity-60")}
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
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Bạn chưa có đơn nào để chọn.
                      </p>
                    )}
                  </div>
                )}

                {/* Hình ảnh đính kèm (tuỳ chọn) */}
                <div>
                  <div className="flex items-baseline justify-between">
                    <label className={labelClass}>Hình ảnh đính kèm</label>
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {images.length}/5
                    </span>
                  </div>
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
                      <label className="flex size-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary">
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
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-white shadow-lg shadow-primary/30 transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {createTicket.isPending || uploading ? (
                    <>
                      <div className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      {uploading ? "Đang tải ảnh..." : "Đang gửi..."}
                    </>
                  ) : (
                    <>
                      <HeadphonesIcon className="size-4" />
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
  const needsMe = !!pendingHint?.urgent;
  const unread = ticket.unreadCount ?? 0;
  const CategoryIcon = CATEGORY_ICON[ticket.category];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative cursor-pointer overflow-hidden rounded-2xl border bg-card pl-4 pr-4 py-4 shadow-sm transition-all hover:shadow-md",
        // Ticket đang chờ CHÍNH NGƯỜI NÀY thì phải nhảy ra khỏi danh sách.
        needsMe
          ? "border-amber-500/40 shadow-amber-500/10 ring-1 ring-amber-500/20"
          : "border-border/50 hover:border-primary/30",
      )}
    >
      {/* Vạch trạng thái — đọc được ticket đang ở đâu mà không cần tìm badge */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          needsMe ? "bg-amber-500" : TONE_BAR_CLASS[STATUS_TONE[ticket.status]],
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Code + vai + priority */}
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            {ticket.ticketCode && (
              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-primary">
                {ticket.ticketCode}
              </span>
            )}
            {ticket.myRole && (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                  isAboutMe
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {isAboutMe ? "Về bạn" : "Bạn gửi"}
              </span>
            )}
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {PRIORITY_LABEL[ticket.priority]}
            </span>
            {ticket.slaBreached && (
              <span className="rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                SLA
              </span>
            )}
          </div>

          <h3 className="line-clamp-1 text-sm font-semibold text-foreground">
            {ticket.subject}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CategoryIcon className="size-3.5 shrink-0" />
            <span className="truncate">
              {categoryLabelFor(ticket.category, viewerRole)}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {unread > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold tabular-nums text-white shadow-sm">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
          <span
            className={cn(
              "rounded-md border px-2 py-0.5 text-[11px] font-bold",
              TONE_BADGE_CLASS[STATUS_TONE[ticket.status]],
            )}
          >
            {STATUS_LABEL[ticket.status]}
          </span>
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {new Date(ticket.updatedAt).toLocaleDateString("vi-VN")}
          </span>
        </div>
      </div>

      {pendingHint && (
        <div
          className={cn(
            "mt-3 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold",
            pendingHint.urgent
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
              : "bg-muted text-muted-foreground",
          )}
        >
          {pendingHint.urgent ? (
            <AlertCircle className="size-3.5 shrink-0" />
          ) : (
            <Clock className="size-3.5 shrink-0" />
          )}
          {pendingHint.text}
        </div>
      )}

      <div className="mt-3 flex items-center justify-end border-t border-border/30 pt-3">
        <span
          className={cn(
            "flex items-center gap-0.5 text-xs font-semibold",
            unread > 0 ? "text-destructive" : "text-primary",
          )}
        >
          {unread > 0 ? `${unread} tin mới` : "Xem chi tiết"}
          <ChevronRight className="size-3.5" />
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

  // Số ticket đang chờ CHÍNH người dùng phản hồi — dòng nhắc trên đầu danh sách
  // để họ không phải tự dò từng card mới biết có việc cần làm.
  const awaitingMeCount = React.useMemo(
    () => tickets.filter((t) => t.status === "PENDING" && t.awaitingMe).length,
    [tickets],
  );

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
      <div className="sticky top-0 z-20 border-b border-border/40 bg-card px-4 pb-3 pt-[max(3rem,env(safe-area-inset-top))] shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => router.back()}
              aria-label="Quay lại"
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted transition-colors hover:bg-muted/70"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold leading-tight text-foreground">
                Yêu cầu hỗ trợ
              </h1>
              {total > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {total} yêu cầu{isFiltering ? " khớp bộ lọc" : ""}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white shadow-md shadow-primary/25 transition-all hover:brightness-105 active:scale-95"
          >
            <Plus className="size-3.5" /> Tạo mới
          </button>
        </div>

        {/* Phạm vi: tôi gửi vs nhắm vào tôi (BE: ?role=reporter|counterparty) */}
        <div
          className={cn("mb-2 flex gap-1.5 overflow-x-auto pb-0.5", SCROLLBAR_HIDDEN)}
        >
          {scopeTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setScope(t.key)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-all",
                scope === t.key
                  ? "border-primary bg-primary text-white shadow-sm shadow-primary/25"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter Tabs — 6 mục nên cuộn ngang thay vì chia đều (chữ bị vỡ dòng) */}
        <div
          className={cn(
            "flex gap-1 overflow-x-auto rounded-xl bg-muted p-1",
            SCROLLBAR_HIDDEN,
          )}
          role="tablist"
          aria-label="Lọc theo trạng thái"
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition-all",
                activeTab === tab.key
                  ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3 px-4 py-4">
        {/* Nhắc việc cần làm — chỉ hiện khi thật sự có ticket chờ người dùng */}
        {!isLoading && awaitingMeCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <AlertCircle className="size-4 shrink-0" />
            <span>
              {awaitingMeCount} yêu cầu đang chờ bạn phản hồi
            </span>
          </div>
        )}

        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-border/50 bg-card"
            />
          ))
        ) : tickets.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/10">
              {isFiltering ? (
                <SlidersHorizontal className="size-8 text-primary" />
              ) : (
                <Inbox className="size-8 text-primary" />
              )}
            </div>
            {/* Rỗng do BỘ LỌC khác hẳn rỗng do CHƯA CÓ ticket nào — không mời
                "tạo yêu cầu đầu tiên" với người đang lọc mà đã có ticket khác. */}
            {isFiltering ? (
              <>
                <h3 className="mb-1 font-bold text-foreground">
                  Không có yêu cầu nào ở mục này
                </h3>
                <p className="mb-6 max-w-xs text-sm text-muted-foreground">
                  Thử chọn mục khác hoặc xem tất cả yêu cầu của bạn.
                </p>
                <button
                  onClick={() => {
                    setActiveTab("ALL");
                    setScope("ALL");
                  }}
                  className="rounded-2xl border border-border px-6 py-3 text-sm font-bold text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  Xoá bộ lọc
                </button>
              </>
            ) : (
              <>
                <h3 className="mb-1 font-bold text-foreground">Chưa có yêu cầu nào</h3>
                <p className="mb-6 max-w-xs text-sm text-muted-foreground">
                  Nếu bạn gặp vấn đề, hãy tạo yêu cầu hỗ trợ — chúng tôi sẽ phản hồi sớm nhất!
                </p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 font-bold text-white shadow-md shadow-primary/25 transition-all hover:brightness-105 active:scale-95"
                >
                  <Plus className="size-4" /> Tạo yêu cầu đầu tiên
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
                  className="w-full rounded-2xl border border-border bg-card py-3 text-sm font-bold text-primary transition-colors hover:border-primary/50 hover:bg-primary/5"
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
