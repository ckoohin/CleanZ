"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { HeadphonesIcon, Plus, ChevronRight, ArrowLeft, ImagePlus, X } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useMyTicketList, useCreateTicket, useMyBookings, useMyTicketUnreadRealtime } from "@/features/support-tickets/hooks/useMyTicket";
import { myTicketApi } from "@/features/support-tickets/services/my-ticket.service";
import { toast } from "sonner";
import type {
  MyTicketSummary,
  TicketStatus,
  TicketCategory,
  CreateTicketDto,
} from "@/features/support-tickets/types/my-ticket.types";
import {
  CATEGORY_OPTIONS,
  CATEGORY_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
  PRIORITY_LABEL,
  TONE_BADGE_CLASS,
} from "@/features/support-tickets/shared/ticket.labels";
import { NO_BOOKING_CATEGORIES } from "@/features/support-tickets/shared/ticket.enums";

function CreateTicketSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const createTicket = useCreateTicket();
  const searchParams = useSearchParams();
  const { data: bookings, isLoading: bookingsLoading } = useMyBookings(open);
  const [images, setImages] = useState<File[]>([]);
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

  const addImages = (files: FileList | null) => {
    if (!files) return;
    const picked = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setImages((prev) => [...prev, ...picked].slice(0, 5));
  };
  const removeImage = (idx: number) => setImages((prev) => prev.filter((_, i) => i !== idx));

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
      try {
        for (const file of images) {
          await myTicketApi.uploadAttachment(created.id, file);
        }
      } catch {
        toast.error("Tạo ticket thành công nhưng có ảnh tải lên thất bại");
      } finally {
        setUploading(false);
      }
    }

    onClose();
    setForm({ category: "", subject: "", description: "", bookingId: "" });
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
                    {CATEGORY_OPTIONS.map((opt) => (
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
                          {b.bookingCode}
                          {b.serviceName ? ` · ${b.serviceName}` : ""}
                          {` · ${b.status}`}
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
                    {images.map((file, idx) => (
                      <div key={idx} className="relative size-16 overflow-hidden rounded-xl border border-border/50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={URL.createObjectURL(file)} alt="đính kèm" className="size-full object-cover" />
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
function TicketCard({ ticket, onClick }: { ticket: MyTicketSummary; onClick: () => void }) {
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
          {/* Code + priority */}
          <div className="flex items-center gap-1.5 mb-1">
            {ticket.ticketCode && (
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                {ticket.ticketCode}
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
            {CATEGORY_LABEL[ticket.category]}
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
type FilterTab = "ALL" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

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
  const [showCreate, setShowCreate] = useState(false);
  useMyTicketUnreadRealtime(); // tin mới → badge ngoài ticket cập nhật tức thì

  // Tự động mở Modal tạo mới nếu phát hiện có tham số khiếu nại đơn từ URL
  React.useEffect(() => {
    const hasParams = searchParams.get("bookingId") || searchParams.get("category");
    if (hasParams) {
      setShowCreate(true);
    }
  }, [searchParams]);

  const statusFilter: TicketStatus | undefined =
    activeTab === "ALL" ? undefined :
    activeTab === "IN_PROGRESS" ? "IN_PROGRESS" :
    activeTab === "RESOLVED" ? "RESOLVED" : "CLOSED";

  const { data, isLoading } = useMyTicketList({
    page: 1,
    limit: 20,
    ...(statusFilter && { status: statusFilter }),
  });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "ALL", label: "Tất cả" },
    { key: "IN_PROGRESS", label: "Đang xử lý" },
    { key: "RESOLVED", label: "Đã xử lý" },
    { key: "CLOSED", label: "Đã đóng" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card px-4 pt-12 pb-4 shadow-sm sticky top-0 z-20">
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

        {/* Filter Tabs */}
        <div className="flex bg-muted p-1 rounded-xl gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
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
        ) : !data?.data?.length ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <HeadphonesIcon className="w-8 h-8 text-primary" />
            </div>
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
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {data.data.map((ticket, index) => (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <TicketCard
                  ticket={ticket}
                  onClick={() => router.push(`${basePath}/${ticket.id}`)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Create Sheet */}
      <CreateTicketSheet open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
};
