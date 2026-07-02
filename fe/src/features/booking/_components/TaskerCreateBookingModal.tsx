"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Phone,
  MapPin,
  PawPrint,
  Clock,
  Loader2,
  CheckCircle2,
  UserRound,
} from "lucide-react";
import {
  useCustomerLookup,
  useCreateBookingForCustomer,
} from "@/features/booking/hooks/useTaskerBooking";
import { usePublicServices } from "@/features/services/hooks/usePublicServices";
import type { CustomerLookupResult } from "@/features/booking/types/booking.types";

function fmtCurrency(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

const DURATION_OPTIONS = [2, 3, 4, 6, 8];

export function TaskerCreateBookingModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState<CustomerLookupResult | null>(null);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [packageId, setPackageId] = useState<string | null>(null);
  const [durationHours, setDurationHours] = useState(2);
  const [startNow, setStartNow] = useState(true);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [note, setNote] = useState("");

  const lookup = useCustomerLookup();
  const create = useCreateBookingForCustomer();
  const { data: servicesData } = usePublicServices();

  const packages = useMemo(
    () => servicesData?.data ?? [],
    [servicesData],
  );

  const selectedAddress = customer?.addresses.find((a) => a.id === addressId);

  const reset = () => {
    setPhone("");
    setCustomer(null);
    setAddressId(null);
    setPackageId(null);
    setDurationHours(2);
    setStartNow(true);
    setScheduledDate("");
    setScheduledTime("");
    setNote("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleLookup = () => {
    if (!phone.trim()) return;
    lookup.mutate(phone.trim(), {
      onSuccess: (data) => {
        setCustomer(data);
        const defaultAddr =
          data.addresses.find((a) => a.isDefault) ?? data.addresses[0];
        setAddressId(defaultAddr?.id ?? null);
      },
    });
  };

  const canSubmit =
    !!customer && !!addressId && !!packageId && (startNow || (!!scheduledDate && !!scheduledTime));

  const handleSubmit = () => {
    if (!canSubmit || !customer) return;
    create.mutate(
      {
        customerPhone: phone.trim(),
        packageId: packageId!,
        addressId: addressId!,
        durationHours,
        note: note.trim() || undefined,
        ...(startNow
          ? {}
          : { scheduledDate, scheduledTime }),
      },
      {
        onSuccess: () => handleClose(),
      },
    );
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
            onClick={handleClose}
            className="fixed inset-0 z-40 bg-black/50"
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-background"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/50 bg-background px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-foreground">Tạo đơn cho khách</h2>
                <p className="text-[11px] text-muted-foreground">
                  Khách có 15 phút để xác nhận sau khi tạo
                </p>
              </div>
              <button
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-4 pb-8">
              {/* Bước 1: tra cứu khách */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  1. Khách hàng
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setCustomer(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                      placeholder="Số điện thoại khách"
                      className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    onClick={handleLookup}
                    disabled={lookup.isPending || !phone.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {lookup.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Tra cứu
                  </button>
                </div>

                {customer && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                        <UserRound className="h-4 w-4 text-emerald-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-emerald-900">
                          {customer.fullName}
                        </p>
                        <p className="text-[11px] text-emerald-700">{phone}</p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                    </div>

                    {/* Chọn địa chỉ */}
                    {customer.addresses.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {customer.addresses.map((addr) => (
                          <button
                            key={addr.id}
                            onClick={() => setAddressId(addr.id)}
                            className={`flex w-full items-start gap-2 rounded-xl border p-2.5 text-left text-xs transition-colors ${
                              addressId === addr.id
                                ? "border-primary bg-primary/5"
                                : "border-border/60 bg-card"
                            }`}
                          >
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                            <span className="min-w-0 flex-1 leading-relaxed">
                              {addr.label && (
                                <span className="font-semibold">{addr.label} · </span>
                              )}
                              {addr.fullAddress}
                            </span>
                            {addr.hasPet && (
                              <PawPrint className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-red-600">
                        Khách chưa có địa chỉ — không thể tạo đơn
                      </p>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Bước 2: dịch vụ */}
              {customer && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    2. Dịch vụ
                  </p>
                  <div className="space-y-2">
                    {packages.map((pkg) => (
                      <button
                        key={pkg.id}
                        onClick={() => setPackageId(pkg.id)}
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                          packageId === pkg.id
                            ? "border-primary bg-primary/5"
                            : "border-border/60 bg-card"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {pkg.name}
                          </p>
                          {typeof pkg.baseHourlyRate === "number" && pkg.baseHourlyRate > 0 && (
                            <p className="text-[11px] text-muted-foreground">
                              từ {fmtCurrency(pkg.baseHourlyRate)}/giờ
                            </p>
                          )}
                        </div>
                        {packageId === pkg.id && (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Số giờ */}
                  <div className="mt-3">
                    <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">Số giờ làm</p>
                    <div className="flex gap-2">
                      {DURATION_OPTIONS.map((h) => (
                        <button
                          key={h}
                          onClick={() => setDurationHours(h)}
                          className={`flex-1 rounded-xl border py-2 text-sm font-bold transition-colors ${
                            durationHours === h
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border/60 bg-card text-foreground"
                          }`}
                        >
                          {h}h
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Bước 3: thời gian */}
              {customer && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    3. Thời gian
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStartNow(true)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
                        startNow
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/60 bg-card"
                      }`}
                    >
                      <Clock className="h-4 w-4" /> Làm ngay
                    </button>
                    <button
                      onClick={() => setStartNow(false)}
                      className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
                        !startNow
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/60 bg-card"
                      }`}
                    >
                      Hẹn lịch
                    </button>
                  </div>
                  {!startNow && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="date"
                        value={scheduledDate}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                      />
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                      />
                    </div>
                  )}

                  {/* Ghi chú */}
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ghi chú cho đơn (tùy chọn)"
                    rows={2}
                    className="mt-3 w-full resize-none rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </motion.div>
              )}

              {/* Submit */}
              {customer && (
                <div className="space-y-2">
                  {selectedAddress?.hasPet && (
                    <p className="flex items-center gap-1.5 text-[11px] text-amber-700">
                      <PawPrint className="h-3.5 w-3.5" /> Địa chỉ có thú cưng — phụ phí sẽ được cộng tự động
                    </p>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit || create.isPending}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
                  >
                    {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Tạo đơn — chờ khách xác nhận
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
