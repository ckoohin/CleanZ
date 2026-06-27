"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AdminButton } from "@/components/admin";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCheck } from "lucide-react";
import { useCreateTicketOnBehalf } from "../hooks/useSupportTicket";
import type { TicketCategory, TicketPriority } from "../types/support-ticket.types";
import {
  CATEGORY_OPTIONS,
  PRIORITY_OPTIONS,
} from "@/features/support-tickets/shared/ticket.labels";
import { NO_BOOKING_CATEGORIES } from "@/features/support-tickets/shared/ticket.enums";
import { LookupCombobox } from "./LookupCombobox";
import { useCustomerLookup, useBookingLookup } from "../hooks/useAdminLookup";
import type {
  CustomerLookupItem,
  BookingLookupItem,
} from "../services/admin-lookup.service";

interface Props {
  open: boolean;
  onClose: () => void;
}

const EMPTY_FORM = {
  reporterUserId: "",
  subject: "",
  description: "",
  category: "" as TicketCategory | "",
  priority: "" as TicketPriority | "",
  bookingId: "",
  assignToSelf: false,
};

export const CreateTicketDialog: React.FC<Props> = ({ open, onClose }) => {
  const createTicket = useCreateTicketOnBehalf();
  const [form, setForm] = useState(EMPTY_FORM);
  const [attempted, setAttempted] = useState(false);

  // Lookup state (combobox tìm kiếm khách hàng / booking)
  const [reporterQuery, setReporterQuery] = useState("");
  const [bookingQuery, setBookingQuery] = useState("");
  const [reporterLabel, setReporterLabel] = useState<string | null>(null);
  const [bookingLabel, setBookingLabel] = useState<string | null>(null);
  const customerLookup = useCustomerLookup(reporterQuery);
  const bookingLookup = useBookingLookup(bookingQuery);

  const category = form.category || null;
  // bookingId bắt buộc trừ category ∈ {ACCOUNT_TECHNICAL, OTHER} (API spec §1.1)
  const requiresBooking =
    !!category && !NO_BOOKING_CATEGORIES.includes(category);

  const errors = {
    reporterUserId: !form.reporterUserId.trim() ? "Vui lòng nhập khách hàng" : "",
    subject: !form.subject.trim() ? "Vui lòng nhập tiêu đề" : "",
    category: !form.category ? "Vui lòng chọn loại" : "",
    description: !form.description.trim() ? "Vui lòng nhập mô tả" : "",
    bookingId:
      requiresBooking && !form.bookingId.trim() ? "Loại này cần mã booking" : "",
  };
  const isValid = !Object.values(errors).some(Boolean);

  const reset = () => {
    setForm(EMPTY_FORM);
    setAttempted(false);
    setReporterQuery("");
    setBookingQuery("");
    setReporterLabel(null);
    setBookingLabel(null);
  };

  const handleSubmit = () => {
    setAttempted(true);
    if (!isValid) return;
    createTicket.mutate(
      {
        reporterUserId: form.reporterUserId.trim(),
        subject: form.subject.trim(),
        description: form.description.trim(),
        category: form.category as TicketCategory,
        ...(form.priority ? { priority: form.priority } : {}),
        // Chỉ gửi bookingId khi category yêu cầu (loại không-booking → bỏ qua)
        ...(requiresBooking && form.bookingId.trim()
          ? { bookingId: form.bookingId.trim() }
          : {}),
        ...(form.assignToSelf ? { assignToSelf: true } : {}),
      },
      {
        onSuccess: () => {
          onClose();
          reset();
        },
      },
    );
  };

  const handleClose = () => {
    onClose();
    reset();
  };

  const showError = (msg: string) => attempted && msg;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="cz-admin sm:max-w-md rounded-2xl bg-[var(--c-card)] border-[var(--c-line)]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-[var(--c-ink)]">Tạo ticket hộ khách hàng</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[var(--c-ink-soft)]">Khách hàng *</Label>
            <LookupCombobox<CustomerLookupItem>
              placeholder="Tìm khách theo tên / SĐT / email..."
              searchPlaceholder="Nhập tên, SĐT hoặc email..."
              items={customerLookup.data ?? []}
              isLoading={customerLookup.isFetching}
              onQueryChange={setReporterQuery}
              getKey={(c) => c.userId}
              getLabel={(c) => c.fullName}
              getSub={(c) => [c.phone, c.email].filter(Boolean).join(" · ")}
              selectedKey={form.reporterUserId || null}
              selectedLabel={reporterLabel}
              onSelect={(c) => {
                setForm((p) => ({ ...p, reporterUserId: c.userId }));
                setReporterLabel(`${c.fullName}${c.phone ? ` · ${c.phone}` : ""}`);
              }}
              onClear={() => {
                setForm((p) => ({ ...p, reporterUserId: "" }));
                setReporterLabel(null);
              }}
              invalid={!!showError(errors.reporterUserId)}
            />
            {showError(errors.reporterUserId) && (
              <p className="text-xs text-[#E11D48]">{errors.reporterUserId}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ct-subject" className="text-xs font-semibold text-[var(--c-ink-soft)]">Tiêu đề *</Label>
            <Input
              id="ct-subject"
              maxLength={255}
              placeholder="Mô tả ngắn vấn đề..."
              value={form.subject}
              onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
              className="text-sm rounded-lg bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)] focus:border-[var(--c-primary)]/50"
              aria-invalid={!!showError(errors.subject)}
            />
            {showError(errors.subject) && (
              <p className="text-xs text-[#E11D48]">{errors.subject}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[var(--c-ink-soft)]">Loại ticket *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => {
                  const cat = v as TicketCategory;
                  const noBooking = NO_BOOKING_CATEGORIES.includes(cat);
                  setForm((p) => ({
                    ...p,
                    category: cat,
                    bookingId: noBooking ? "" : p.bookingId,
                  }));
                  if (noBooking) {
                    setBookingLabel(null);
                    setBookingQuery("");
                  }
                }}
              >
                <SelectTrigger className="h-9 rounded-lg text-sm w-full border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-[var(--c-ink)]" aria-invalid={!!showError(errors.category)}>
                  <SelectValue placeholder="Chọn loại..." />
                </SelectTrigger>
                <SelectContent className="cz-admin">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showError(errors.category) && (
                <p className="text-xs text-[#E11D48]">{errors.category}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[var(--c-ink-soft)]">Độ ưu tiên</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm((p) => ({ ...p, priority: v as TicketPriority }))}
              >
                <SelectTrigger className="h-9 rounded-lg text-sm w-full border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-[var(--c-ink)]">
                  <SelectValue placeholder="Tự động..." />
                </SelectTrigger>
                <SelectContent className="cz-admin">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ct-desc" className="text-xs font-semibold text-[var(--c-ink-soft)]">Mô tả chi tiết *</Label>
            <Textarea
              id="ct-desc"
              placeholder="Nội dung vấn đề..."
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              className="text-sm rounded-lg resize-none bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)] focus:border-[var(--c-primary)]/50"
              aria-invalid={!!showError(errors.description)}
            />
            {showError(errors.description) && (
              <p className="text-xs text-[#E11D48]">{errors.description}</p>
            )}
          </div>

          {/* bookingId chỉ hiển thị khi category yêu cầu (ẩn với ACCOUNT_TECHNICAL/OTHER) */}
          {requiresBooking && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[var(--c-ink-soft)]">Mã booking *</Label>
              <LookupCombobox<BookingLookupItem>
                placeholder="Tìm booking theo mã / tên khách..."
                searchPlaceholder="Nhập mã booking hoặc tên khách..."
                items={bookingLookup.data ?? []}
                isLoading={bookingLookup.isFetching}
                onQueryChange={setBookingQuery}
                getKey={(b) => b.id}
                getLabel={(b) => b.bookingCode ?? b.id}
                getSub={(b) => b.customerName ?? ""}
                selectedKey={form.bookingId || null}
                selectedLabel={bookingLabel}
                onSelect={(b) => {
                  setForm((p) => ({ ...p, bookingId: b.id }));
                  setBookingLabel(b.bookingCode ?? b.id);
                }}
                onClear={() => {
                  setForm((p) => ({ ...p, bookingId: "" }));
                  setBookingLabel(null);
                }}
                invalid={!!showError(errors.bookingId)}
              />
              {showError(errors.bookingId) && (
                <p className="text-xs text-[#E11D48]">{errors.bookingId}</p>
              )}
            </div>
          )}

          {/* Tự nhận xử lý (hotline): BE set NEW→IN_PROGRESS */}
          <label className="flex items-center justify-between gap-2 rounded-lg border border-[var(--c-line)] p-3 cursor-pointer">
            <span className="flex items-center gap-2 text-sm text-[var(--c-ink)]">
              <UserCheck className="w-4 h-4 text-[var(--c-primary-strong)]" />
              <span>
                Tự nhận xử lý ngay
                <span className="block text-xs text-[var(--c-muted)]">Chuyển ticket sang &quot;Đang xử lý&quot; và gán cho bạn.</span>
              </span>
            </span>
            <Switch
              checked={form.assignToSelf}
              onCheckedChange={(v) => setForm((p) => ({ ...p, assignToSelf: v }))}
              aria-label="Tự nhận xử lý ngay"
            />
          </label>
        </div>

        <DialogFooter className="gap-2">
          <AdminButton variant="secondary" size="sm" className="rounded-full" onClick={handleClose}>
            Huỷ
          </AdminButton>
          <AdminButton
            variant="primary"
            size="sm"
            className="rounded-full"
            onClick={handleSubmit}
            disabled={(attempted && !isValid) || createTicket.isPending}
          >
            {createTicket.isPending ? "Đang tạo..." : "Tạo ticket"}
          </AdminButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
