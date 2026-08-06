"use client";

import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Phone,
  MapPin,
  PawPrint,
  Clock,
  CalendarIcon,
  Loader2,
  CheckCircle2,
  UserRound,
  Tag,
  TicketPercent,
} from "lucide-react";
import {
  useCustomerLookup,
  useCreateBookingForCustomer,
  useTaskerCustomerVouchers,
} from "@/features/booking/hooks/useTaskerBooking";
import { usePublicServices } from "@/features/services/hooks/usePublicServices";
import { GoongAutocomplete } from "@/components/maps/GoongAutocomplete";
import { GOONG_API_KEY } from "@/lib/maps/goong-config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { CustomerLookupResult } from "@/features/booking/types/booking.types";
import type {
  PublicAddon,
  PublicDuration,
  PublicService,
} from "@/features/services/types/public-service.type";
import type { AvailableVoucher } from "@/features/customer/vouchers/useCustomerVouchers";

function fmtCurrency(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

function formatVietnamDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function parseScheduleDate(date: string): Date | undefined {
  if (!date) return undefined;
  const parsed = new Date(`${date}T12:00:00+07:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatScheduleDateLabel(date: string): string {
  const parsed = parseScheduleDate(date);
  if (!parsed) return "Chọn ngày";

  return parsed.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

const HOURS = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);
const MINUTES = ["00", "10", "20", "30", "40", "50"];

function getTimeParts(time: string): { hour: string; minute: string } {
  if (/^\d{2}:\d{2}$/.test(time)) {
    const [hour, minute] = time.split(":");
    return {
      hour: HOURS.includes(hour) ? hour : "08",
      minute: MINUTES.includes(minute) ? minute : "00",
    };
  }

  return { hour: "08", minute: "00" };
}

function getAddonExtraHours(addon: PublicAddon): number {
  return addon.durationMinutes ? addon.durationMinutes / 60 : 0;
}

function getTotalWorkHours(
  durationHours: number,
  addons: PublicAddon[],
  addonIds: string[],
): number {
  return (
    durationHours +
    addons
      .filter((addon) => addonIds.includes(addon.id))
      .reduce((sum, addon) => sum + getAddonExtraHours(addon), 0)
  );
}

function filterAddonsWithinMaxHours(
  addons: PublicAddon[],
  addonIds: string[],
  durationHours: number,
  maxHours?: number | null,
): string[] {
  if (maxHours == null) return addonIds;

  let usedHours = durationHours;
  const kept: string[] = [];
  for (const id of addonIds) {
    const addon = addons.find((item) => item.id === id);
    const extraHours = addon ? getAddonExtraHours(addon) : 0;
    if (usedHours + extraHours <= maxHours) {
      kept.push(id);
      usedHours += extraHours;
    }
  }

  return kept;
}

function getDurationOptions(pkg?: PublicService): PublicDuration[] {
  if (!pkg) return [];
  if (pkg.durations?.length) return pkg.durations;

  const fallbackHours =
    pkg.pricingTiers?.[0]?.defaultHours ??
    pkg.pricingTiers?.[0]?.minHours ??
    pkg.baseDurationHours ??
    2;

  return [
    {
      id: "default",
      durationHours: fallbackHours,
      title: `${fallbackHours} giờ`,
      description: null,
      priceMultiplier: 1,
      isPopular: false,
      suggestedArea: null,
      taskerCount: 1,
    },
  ];
}

function getVoucherDiscountLabel(voucher: AvailableVoucher): string {
  if (voucher.type === "PERCENT") {
    return `Giảm ${voucher.value}%${
      voucher.maxDiscount ? ` tối đa ${fmtCurrency(voucher.maxDiscount)}` : ""
    }`;
  }

  return `Giảm ${fmtCurrency(voucher.value)}`;
}

function TaskerVoucherPicker({
  phone,
  packageId,
  selectedCode,
  onSelect,
  disabled,
}: {
  phone: string;
  packageId?: string;
  selectedCode: string;
  onSelect: (code: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { data: vouchers = [], isLoading } = useTaskerCustomerVouchers(
    phone,
    packageId,
    open && !disabled,
  );
  const selectedVoucher = vouchers.find((item) => item.code === selectedCode);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-all disabled:opacity-50 ${
          selectedCode
            ? "border-primary bg-primary/5"
            : "border-border/60 bg-card hover:border-primary/40"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Tag className={`h-4 w-4 shrink-0 ${selectedCode ? "text-primary" : "text-muted-foreground"}`} />
          {selectedVoucher ? (
            <span className="min-w-0">
              <span className="block truncate font-semibold text-foreground">
                {selectedVoucher.name}
              </span>
              <span className="block text-xs font-medium text-emerald-600">
                {getVoucherDiscountLabel(selectedVoucher)}
              </span>
            </span>
          ) : selectedCode ? (
            <span className="font-mono font-semibold text-primary">
              {selectedCode}
            </span>
          ) : (
            <span className="text-muted-foreground">
              Chọn hoặc nhập mã voucher
            </span>
          )}
        </span>
        <span className="text-xs font-semibold text-muted-foreground">
          {open ? "Đóng" : "Mở"}
        </span>
      </button>

      {open && (
        <div className="space-y-2 rounded-2xl border border-border/60 bg-card p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={selectedCode}
              onChange={(event) => onSelect(event.target.value.toUpperCase())}
              placeholder="Nhập mã voucher..."
              className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-mono uppercase outline-none focus:border-primary"
            />
            {selectedCode && (
              <button
                type="button"
                onClick={() => onSelect("")}
                className="rounded-xl border border-border/60 px-3 text-xs font-semibold text-muted-foreground"
              >
                Bỏ
              </button>
            )}
          </div>

          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải voucher...
            </div>
          )}

          {!isLoading && vouchers.length === 0 && (
            <p className="rounded-xl bg-muted/40 px-3 py-3 text-center text-xs text-muted-foreground">
              Không có voucher khả dụng. Bạn vẫn có thể nhập mã thủ công.
            </p>
          )}

          {!isLoading &&
            vouchers
              .filter((voucher) => voucher.canUse)
              .map((voucher) => {
                const selected = selectedCode === voucher.code;
                return (
                  <button
                    key={voucher.id}
                    type="button"
                    onClick={() => {
                      onSelect(selected ? "" : voucher.code);
                      setOpen(false);
                    }}
                    className={`flex w-full items-start gap-2 rounded-xl border p-3 text-left transition-colors ${
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border/60 bg-background hover:border-primary/40"
                    }`}
                  >
                    <TicketPercent className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-xs font-bold text-primary">
                        {voucher.code}
                      </span>
                      <span className="block text-sm font-semibold text-foreground">
                        {voucher.name}
                      </span>
                      <span className="block text-xs font-medium text-emerald-600">
                        {getVoucherDiscountLabel(voucher)}
                      </span>
                    </span>
                    {selected && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </button>
                );
              })}
        </div>
      )}
    </div>
  );
}

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
  const [addressText, setAddressText] = useState("");
  const [addressLat, setAddressLat] = useState<number | null>(null);
  const [addressLng, setAddressLng] = useState<number | null>(null);
  const [packageId, setPackageId] = useState<string | null>(null);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [pricingTierId, setPricingTierId] = useState<string | null>(null);
  const [durationHours, setDurationHours] = useState(2);
  const [startNow, setStartNow] = useState(true);
  const [scheduledDate, setScheduledDate] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");
  const [note, setNote] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [hasPet, setHasPet] = useState(false);
  // Chế độ khách vãng lai: SĐT chưa có tài khoản → tạo đơn offline.
  const [isWalkin, setIsWalkin] = useState(false);
  const [walkinName, setWalkinName] = useState("");

  const lookup = useCustomerLookup();
  const create = useCreateBookingForCustomer();
  const { data: servicesData } = usePublicServices();

  const packages = useMemo(
    () => servicesData?.data ?? [],
    [servicesData],
  );
  const selectedPackage = useMemo(
    () => packages.find((pkg) => pkg.id === packageId),
    [packageId, packages],
  );
  const durationOptions = useMemo(
    () => getDurationOptions(selectedPackage),
    [selectedPackage],
  );
  const selectedAddons = selectedPackage?.addons ?? [];
  const totalWorkHours = selectedPackage
    ? getTotalWorkHours(durationHours, selectedAddons, addonIds)
    : durationHours;
  const scheduledTimeParts = getTimeParts(scheduledTime);
  const selectedAddressLabel =
    customer?.addresses.find((addr) => addr.id === addressId)?.fullAddress ??
    addressText;

  const reset = () => {
    setPhone("");
    setCustomer(null);
    setAddressId(null);
    setAddressText("");
    setAddressLat(null);
    setAddressLng(null);
    setPackageId(null);
    setAddonIds([]);
    setPricingTierId(null);
    setDurationHours(2);
    setStartNow(true);
    setScheduledDate("");
    setDatePickerOpen(false);
    setScheduledTime("");
    setNote("");
    setVoucherCode("");
    setHasPet(false);
    setIsWalkin(false);
    setWalkinName("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleLookup = () => {
    if (!phone.trim()) return;
    lookup.mutate(phone.trim(), {
      onSuccess: (data) => {
        setIsWalkin(false);
        setWalkinName("");
        setCustomer(data);
        const defaultAddr =
          data.addresses.find((a) => a.isDefault) ?? data.addresses[0];
        setAddressId(defaultAddr?.id ?? null);
        setAddressText(defaultAddr?.fullAddress ?? "");
        setAddressLat(null);
        setAddressLng(null);
        setHasPet(defaultAddr?.hasPet ?? false);
      },
      onError: (err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        if (status === 404) {
          setCustomer(null);
          setIsWalkin(true);
          setAddressId(null);
          setAddressText("");
          setAddressLat(null);
          setAddressLng(null);
          setVoucherCode("");
          setHasPet(false);
        }
      },
    });
  };

  const handleSearchAddressSelect = (placeId: string, description: string) => {
    setAddressId(null);
    setAddressText(description);
    setAddressLat(null);
    setAddressLng(null);

    fetch(
      `https://rsapi.goong.io/Place/Detail?place_id=${placeId}&api_key=${GOONG_API_KEY}`,
    )
      .then((response) => response.json())
      .then((data) => {
        const loc = data?.result?.geometry?.location;
        if (
          typeof loc?.lat === "number" &&
          typeof loc?.lng === "number"
        ) {
          setAddressLat(loc.lat);
          setAddressLng(loc.lng);
        }
      })
      .catch(() => {
        setAddressLat(null);
        setAddressLng(null);
      });
  };

  const handleScheduleModeChange = (nextStartNow: boolean) => {
    setStartNow(nextStartNow);
    if (!nextStartNow && !scheduledTime) {
      setScheduledTime("08:00");
    }
  };

  const handleTimePartSelect = (part: "hour" | "minute", value: string) => {
    const nextTime =
      part === "hour"
        ? `${value}:${scheduledTimeParts.minute}`
        : `${scheduledTimeParts.hour}:${value}`;
    setScheduledTime(nextTime);
  };

  const handleScheduleDateSelect = (date?: Date) => {
    if (!date) return;
    setScheduledDate(formatVietnamDate(date));
    setDatePickerOpen(false);
  };

  const handleSelectPackage = (pkg: PublicService) => {
    const defaultDuration =
      pkg.durations?.find((duration) => duration.isPopular) ??
      pkg.durations?.[0];
    const defaultTier = pkg.pricingTiers?.[0];
    const nextDurationHours =
      defaultDuration?.durationHours ??
      defaultTier?.defaultHours ??
      defaultTier?.minHours ??
      pkg.baseDurationHours ??
      2;

    setPackageId(pkg.id);
    setPricingTierId(defaultTier?.id ?? null);
    setDurationHours(nextDurationHours);
    setAddonIds([]);
    setVoucherCode("");
  };

  const toggleAddon = (addon: PublicAddon) => {
    const exists = addonIds.includes(addon.id);
    if (exists) {
      setAddonIds((current) => current.filter((id) => id !== addon.id));
      return;
    }

    if (selectedPackage?.maxHours != null) {
      const nextTotal = totalWorkHours + getAddonExtraHours(addon);
      if (nextTotal > selectedPackage.maxHours) {
        return;
      }
    }

    setAddonIds((current) => [...current, addon.id]);
  };

  const canSubmit =
    (!!customer || isWalkin) &&
    (!isWalkin || !!walkinName.trim()) &&
    !!packageId &&
    !!selectedAddressLabel &&
    (startNow || (!!scheduledDate && !!scheduledTime));

  /**
   * Sheet luôn bám đáy, không đổi vị trí theo bước.
   *
   * Trước đây khi chưa chọn khách, sheet được đẩy về `top-[40dvh] bottom-auto` cho
   * gọn — nhưng nó khiến modal treo lơ lửng giữa màn hình, và lúc chọn xong khách
   * thì `top` phải chuyển từ `40dvh` sang `auto`: CSS không nội suy được sang `auto`
   * nên modal nhảy giật một nhịp thay vì trượt.
   */
  const sheetClassName =
    "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-3xl md:max-h-[92vh]";

  const handleSubmit = () => {
    if (!canSubmit || (!customer && !isWalkin)) return;
    create.mutate(
      {
        customerPhone: phone.trim(),
        // Khách vãng lai: gửi tên khách → BE tạo đơn offline; không áp voucher,
        // luôn dùng địa chỉ nhập tay (khách không có sổ địa chỉ).
        ...(isWalkin ? { customerName: walkinName.trim() } : {}),
        packageId: packageId!,
        addonIds: addonIds.length > 0 ? addonIds : undefined,
        ...(!isWalkin && addressId
          ? { addressId }
          : {
              address: addressText.trim(),
              latitude: addressLat ?? undefined,
              longitude: addressLng ?? undefined,
            }),
        durationHours,
        pricingTierId: pricingTierId ?? undefined,
        hasPet,
        note: note.trim() || undefined,
        voucherCode: isWalkin ? undefined : voucherCode.trim() || undefined,
        ...(startNow
          ? {}
          : { scheduledDate, scheduledTime }),
      },
      {
        onSuccess: () => handleClose(),
      },
    );
  };

  /**
   * Phải render qua portal ra thẳng `document.body`.
   *
   * Layout tasker bọc mọi trang trong `motion.div` có `x: 12` và
   * `willChange: "opacity, transform"` — cả transform lẫn will-change đều tạo
   * containing block mới, nên `position: fixed` bên trong bị neo theo div đó thay
   * vì viewport: sheet lệch khỏi đáy màn hình và backdrop không phủ hết.
   *
   * Layout đã xử lý đúng chuyện này cho Sidebar và ActiveJobWidget bằng cách đặt
   * chúng NGOÀI motion.div; modal thì không làm được vậy vì nó thuộc cây con của
   * trang, nên dùng portal.
   */
  // `document` không tồn tại phía server; modal chỉ mở sau tương tác nên nhánh này
  // không gây lệch hydration.
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[70] bg-black/50"
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className={`fixed z-[80] overflow-y-auto bg-background shadow-2xl ${sheetClassName}`}
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
                        setAddressId(null);
                        setAddressText("");
                        setAddressLat(null);
                        setAddressLng(null);
                        setVoucherCode("");
                        setIsWalkin(false);
                        setWalkinName("");
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
                            onClick={() => {
                              setAddressId(addr.id);
                              setAddressText(addr.fullAddress);
                              setAddressLat(null);
                              setAddressLng(null);
                              setHasPet(addr.hasPet);
                            }}
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
                      <p className="mt-2 text-xs text-muted-foreground">
                        Khách chưa có địa chỉ đã lưu.
                      </p>
                    )}

                    <div className="mt-3 space-y-2">
                      <p className="text-[11px] font-semibold text-emerald-800">
                        Tìm địa chỉ khác
                      </p>
                      <GoongAutocomplete
                        placeholder="Tìm địa chỉ tại Hà Nội..."
                        className="z-30"
                        onSelect={handleSearchAddressSelect}
                      />
                      {!addressId && addressText && (
                        <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-2.5 text-xs text-foreground">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="leading-relaxed">{addressText}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Khách vãng lai — chưa có tài khoản, tạo đơn offline */}
                {isWalkin && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
                        <UserRound className="h-4 w-4 text-amber-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-amber-900">
                          Khách vãng lai
                        </p>
                        <p className="text-[11px] text-amber-700">
                          {phone} · chưa có tài khoản → tạo đơn offline
                        </p>
                      </div>
                    </div>

                    {/* Tên khách */}
                    <div className="mt-3">
                      <label className="text-[11px] font-semibold text-amber-800">
                        Tên khách <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={walkinName}
                        onChange={(e) => setWalkinName(e.target.value)}
                        placeholder="Nhập tên khách"
                        className="mt-1 w-full rounded-xl border border-amber-300 bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                      />
                    </div>

                    {/* Địa chỉ nhập tay (khách không có sổ địa chỉ) */}
                    <div className="mt-3 space-y-2">
                      <p className="text-[11px] font-semibold text-amber-800">
                        Địa chỉ làm việc <span className="text-red-500">*</span>
                      </p>
                      <GoongAutocomplete
                        placeholder="Tìm địa chỉ tại Hà Nội..."
                        className="z-30"
                        onSelect={handleSearchAddressSelect}
                      />
                      {addressText && (
                        <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-2.5 text-xs text-foreground">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="leading-relaxed">{addressText}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Bước 2: dịch vụ */}
              {(customer || isWalkin) && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    2. Dịch vụ
                  </p>
                  <div className="space-y-2">
                    {packages.map((pkg) => (
                      <button
                        key={pkg.id}
                        onClick={() => handleSelectPackage(pkg)}
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
                  {selectedPackage && (
                    <div className="mt-3">
                      <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
                        Số giờ làm
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {durationOptions.map((duration) => (
                          <button
                            key={duration.id}
                            onClick={() => {
                              setDurationHours(duration.durationHours);
                              setAddonIds((current) =>
                                filterAddonsWithinMaxHours(
                                  selectedAddons,
                                  current,
                                  duration.durationHours,
                                  selectedPackage.maxHours,
                                ),
                              );
                            }}
                            className={`min-w-[64px] flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition-colors ${
                              durationHours === duration.durationHours
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border/60 bg-card text-foreground"
                            }`}
                          >
                            {duration.durationHours}h
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedPackage && selectedAddons.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
                        Dịch vụ thêm
                      </p>
                      <div className="space-y-2">
                        {selectedAddons.map((addon) => {
                          const selected = addonIds.includes(addon.id);
                          const extraHours = getAddonExtraHours(addon);
                          const disabled =
                            !selected &&
                            selectedPackage.maxHours != null &&
                            totalWorkHours + extraHours >
                              selectedPackage.maxHours;
                          return (
                            <button
                              key={addon.id}
                              type="button"
                              onClick={() => toggleAddon(addon)}
                              aria-disabled={disabled}
                              className={`flex w-full items-start gap-2 rounded-xl border p-3 text-left transition-colors ${
                                selected
                                  ? "border-primary bg-primary/5"
                                  : disabled
                                    ? "cursor-not-allowed border-border/40 bg-muted/40 opacity-60"
                                    : "border-border/60 bg-card hover:border-primary/40"
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground">
                                  {addon.name}
                                </p>
                                {addon.description && (
                                  <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                                    {addon.description}
                                  </p>
                                )}
                                <p className="mt-1 text-[11px] font-bold text-primary">
                                  +{fmtCurrency(addon.price)}
                                  {addon.durationMinutes
                                    ? ` · +${addon.durationMinutes} phút`
                                    : ""}
                                </p>
                              </div>
                              <span
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                  selected
                                    ? "border-primary bg-primary text-white"
                                    : "border-border"
                                }`}
                              >
                                {selected && (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedPackage?.maxHours != null && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Tổng thời lượng: {totalWorkHours}h / tối đa{" "}
                      {selectedPackage.maxHours}h
                    </p>
                  )}
                </motion.div>
              )}

              {/* Bước 3: thời gian */}
              {(customer || isWalkin) && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    3. Thời gian
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleScheduleModeChange(true)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
                        startNow
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/60 bg-card"
                      }`}
                    >
                      <Clock className="h-4 w-4" /> Làm ngay
                    </button>
                    <button
                      onClick={() => handleScheduleModeChange(false)}
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
                      <Popover
                        open={datePickerOpen}
                        onOpenChange={setDatePickerOpen}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border bg-card px-3 py-2.5 text-left text-sm transition-colors ${
                              scheduledDate
                                ? "border-primary/50 text-foreground"
                                : "border-border text-muted-foreground"
                            } focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15`}
                          >
                            <span className="truncate font-semibold">
                              {formatScheduleDateLabel(scheduledDate)}
                            </span>
                            <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          className="z-[90] w-[min(calc(100vw-2rem),360px)] rounded-2xl border-border/70 bg-card p-0 shadow-xl"
                        >
                          <Calendar
                            mode="single"
                            selected={parseScheduleDate(scheduledDate)}
                            onSelect={handleScheduleDateSelect}
                            disabled={(date) =>
                              formatVietnamDate(date) < formatVietnamDate(new Date())
                            }
                            className="rounded-2xl"
                          />
                        </PopoverContent>
                      </Popover>
                      <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-2 py-1.5 focus-within:border-primary">
                        <Select
                          value={scheduledTimeParts.hour}
                          onValueChange={(value) =>
                            handleTimePartSelect("hour", value)
                          }
                        >
                          <SelectTrigger
                            aria-label="Giờ"
                            value={scheduledTimeParts.hour}
                            className="relative h-9 min-w-0 flex-1 justify-center rounded-lg border-0 bg-background px-2 pr-6 text-center text-sm font-black shadow-none focus:ring-2 focus:ring-primary/15 [&>svg]:absolute [&>svg]:right-2 [&>svg]:h-3.5 [&>svg]:w-3.5 [&_[data-slot=select-value]]:justify-center"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent
                            align="center"
                            className="z-[80] max-h-56 min-w-[92px] rounded-2xl border-border/70 bg-card p-1 shadow-xl"
                          >
                            {HOURS.map((hour) => (
                              <SelectItem
                                key={hour}
                                value={hour}
                                className="h-9 justify-center rounded-xl text-sm font-black focus:bg-primary/10 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground [&>span:first-child]:right-2"
                              >
                                {hour}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-sm font-black text-muted-foreground">
                          :
                        </span>
                        <Select
                          value={scheduledTimeParts.minute}
                          onValueChange={(value) =>
                            handleTimePartSelect("minute", value)
                          }
                        >
                          <SelectTrigger
                            aria-label="Phút"
                            value={scheduledTimeParts.minute}
                            className="relative h-9 min-w-0 flex-1 justify-center rounded-lg border-0 bg-background px-2 pr-6 text-center text-sm font-black shadow-none focus:ring-2 focus:ring-primary/15 [&>svg]:absolute [&>svg]:right-2 [&>svg]:h-3.5 [&>svg]:w-3.5 [&_[data-slot=select-value]]:justify-center"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent
                            align="center"
                            className="z-[80] min-w-[92px] rounded-2xl border-border/70 bg-card p-1 shadow-xl"
                          >
                            {MINUTES.map((minute) => (
                              <SelectItem
                                key={minute}
                                value={minute}
                                className="h-9 justify-center rounded-xl text-sm font-black focus:bg-primary/10 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground [&>span:first-child]:right-2"
                              >
                                {minute}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Thú cưng — mặc định theo địa chỉ, tasker có thể tích tay */}
                  <button
                    type="button"
                    onClick={() => setHasPet((v) => !v)}
                    className={`mt-3 flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                      hasPet
                        ? "border-amber-300 bg-amber-50 text-amber-800"
                        : "border-border/60 bg-card text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <PawPrint className="h-4 w-4" /> Nhà có thú cưng
                    </span>
                    <span
                      className={`relative h-5 w-9 rounded-full transition-colors ${
                        hasPet ? "bg-amber-500" : "bg-muted-foreground/30"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                          hasPet ? "left-4" : "left-0.5"
                        }`}
                      />
                    </span>
                  </button>

                  {/* Voucher — mã tasker áp cho khách (khách vãng lai không áp) */}
                  {!isWalkin && (
                    <div className="mt-2">
                      <TaskerVoucherPicker
                        phone={phone.trim()}
                        packageId={packageId ?? undefined}
                        selectedCode={voucherCode}
                        onSelect={setVoucherCode}
                        disabled={!packageId || !customer}
                      />
                    </div>
                  )}

                  {/* Ghi chú */}
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ghi chú cho đơn (tùy chọn)"
                    rows={2}
                    className="mt-2 w-full resize-none rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </motion.div>
              )}

              {/* Submit */}
              {(customer || isWalkin) && (
                <div className="space-y-2">
                  {hasPet && (
                    <p className="flex items-center gap-1.5 text-[11px] text-amber-700">
                      <PawPrint className="h-3.5 w-3.5" /> Nhà có thú cưng — phụ phí sẽ được cộng tự động
                    </p>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit || create.isPending}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
                  >
                    {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isWalkin
                      ? "Tạo đơn cho khách vãng lai"
                      : "Tạo đơn — chờ khách xác nhận"}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
