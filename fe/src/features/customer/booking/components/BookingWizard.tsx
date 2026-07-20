"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  MapPin,
  Loader2,
  Calendar,
  MapPinned,
  Search,
  Package,
  Sparkles,
  PawPrint,
} from "lucide-react";
import { GoongMap } from "@/components/maps/GoongMap";
import { GoongAutocomplete } from "@/components/maps/GoongAutocomplete";
import { GOONG_API_KEY } from "@/lib/maps/goong-config";
import {
  useBookingQuote,
  useBookingQuoteQuery,
  useCreateAdyenBookingSession,
  useCreateBooking,
} from "@/features/booking/hooks/useCustomerBooking";
import {
  useCustomerWallet,
  useMyCards,
  useRemoveCard,
} from "@/features/customer/wallet/hooks/useCustomerWallet";
import { useAdyenDropin } from "@/features/wallet/hooks/useAdyenDropin";
import { SavedCardPicker } from "@/features/wallet/components/SavedCardPicker";
import { VoucherPickerSheet } from "@/features/customer/vouchers/VoucherPickerSheet";
import type {
  AdyenBookingCheckoutSession,
  BookingQuoteResponse,
  CreateBookingDto,
  PaymentMethod,
} from "@/features/booking/types/booking.types";
import { usePublicServices } from "@/features/services/hooks/usePublicServices";
import type {
  PublicAddon,
  PublicDuration,
  PublicPeakHour,
  PublicPricingTier,
  PublicService,
} from "@/features/services/types/public-service.type";
import {
  useCreateCustomerAddress,
  useCustomerAddresses,
} from "@/features/customer/profile/hooks/useCustomerAddresses";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ServiceOption {
  id: string;
  name: string;
  description?: string | null;
  maxHours: number | null;
  basePrice: number;
  baseHourlyRate: number;
  pricingTiers: PublicPricingTier[];
  durations: PublicDuration[];
  addons: PublicAddon[];
}

// 0=Dịch vụ, 1=Địa chỉ, 2=Lịch, 3=Thanh toán, 4=Xác nhận, 5=Thành công
type Step = 0 | 1 | 2 | 3 | 4 | 5;

interface WizardState {
  serviceId: string;        // ServicePackage ID
  pricingTierId: string;
  durationHours: number | null;
  areaM2: number | null;
  addonIds: string[];  // Option/dịch vụ thêm IDs chọn thêm
  // Địa chỉ
  addressId: string;
  selectedAddress: string; // địa chỉ hiển thị
  selectedLat: number | null;
  selectedLng: number | null;
  hasPet: boolean;
  // Lịch
  scheduledDate: string;
  scheduledTime: string;
  note: string;
  // Thanh toán
  paymentMethod: PaymentMethod;
  // "new" = nhập thẻ mới (Adyen); ngược lại là id thẻ đã lưu.
  adyenCardId: string;
  voucherCode: string;
}

const INIT_STATE: WizardState = {
  serviceId: "",
  pricingTierId: "",
  durationHours: null,
  areaM2: null,
  addonIds: [],
  addressId: "",
  selectedAddress: "",
  selectedLat: null,
  selectedLng: null,
  hasPet: false,
  scheduledDate: "",
  scheduledTime: "",
  note: "",
  paymentMethod: "CASH",
  adyenCardId: "new",
  voucherCode: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCurrency(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

function formatVietnamDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function getNext7Days() {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
    const date = formatVietnamDate(d);
    days.push({
      date,
      label:
        i === 0
          ? "Hôm nay"
          : i === 1
            ? "Ngày mai"
            : d.toLocaleDateString("vi-VN", {
                weekday: "short",
                timeZone: "Asia/Ho_Chi_Minh",
              }),
      dayNum: d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh",
      }),
      dayOfMonth: d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh",
      }),
      weekday: d
        .toLocaleDateString("vi-VN", {
          weekday: "short",
          timeZone: "Asia/Ho_Chi_Minh",
        })
        .replace("Th ", "T"),
    });
  }
  return days;
}

const HOURS = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);
const MINUTES = ["00", "15", "30", "45"];
const MINUTE_STEP = 15;
const SERVICE_DAY_START_MINUTES = 6 * 60;
const SERVICE_DAY_END_MINUTES = 23 * 60;
const MIN_SCHEDULE_LEAD_MINUTES = 60;

function getScheduleDateTime(date: string, time = "00:00"): Date {
  return new Date(`${date}T${time}:00+07:00`);
}

function isBeforeMinimumScheduleLead(date: string, time = "00:00"): boolean {
  if (!date) return false;

  const selectedDateTime = getScheduleDateTime(date, time);
  const minimumDateTime =
    Date.now() + MIN_SCHEDULE_LEAD_MINUTES * 60 * 1000;

  return (
    Number.isNaN(selectedDateTime.getTime()) ||
    selectedDateTime.getTime() < minimumDateTime
  );
}

function isPastDate(date: string): boolean {
  return date < formatVietnamDate(new Date());
}

function isConfiguredAddon(addon: PublicAddon): boolean {
  const price = Number(addon.price);
  return (
    !!addon.id &&
    !!addon.name?.trim() &&
    Number.isFinite(price) &&
    price >= 0
  );
}

// Một số dịch vụ thêm phát sinh thời gian làm việc thật (addon.durationMinutes),
// cộng dồn vào tổng giờ công việc để so với maxHours của gói — tránh chọn addon
// khiến tổng thời lượng thực tế vượt quá số giờ tối đa gói cho phép.
function getAddonExtraHours(addon: Pick<PublicAddon, "durationMinutes">): number {
  return addon.durationMinutes ? addon.durationMinutes / 60 : 0;
}

function getSelectedAddonExtraHours(
  addons: PublicAddon[],
  addonIds: string[],
): number {
  return addons
    .filter((addon) => addonIds.includes(addon.id))
    .reduce((sum, addon) => sum + getAddonExtraHours(addon), 0);
}

function getTotalWorkHours(
  addons: PublicAddon[],
  durationHours: number | null,
  addonIds: string[],
): number {
  return (durationHours ?? 0) + getSelectedAddonExtraHours(addons, addonIds);
}

// Giữ lại addon theo thứ tự đã chọn, bỏ dần addon nào khiến tổng giờ vượt quá
// maxHours của gói (dùng khi đổi gói giờ/tier làm giảm số giờ còn trống).
function filterAddonsWithinMaxHours(
  service: Pick<ServiceOption, "maxHours" | "addons"> | undefined,
  durationHours: number | null,
  addonIds: string[],
): string[] {
  if (!service?.maxHours) return addonIds;
  let usedHours = durationHours ?? 0;
  const kept: string[] = [];
  for (const id of addonIds) {
    const addon = service.addons.find((item) => item.id === id);
    const extra = addon ? getAddonExtraHours(addon) : 0;
    if (usedHours + extra <= service.maxHours) {
      kept.push(id);
      usedHours += extra;
    }
  }
  return kept;
}

function timeToMinutes(time: string): number {
  const [hour = "0", minute = "0"] = time.slice(0, 5).split(":");
  return Number(hour) * 60 + Number(minute);
}

function getVietnamTimeParts(date: Date): { hour: string; minute: string } {
  const parts = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    hour: values.hour === "24" ? "00" : values.hour,
    minute: values.minute,
  };
}

function getTimeParts(time: string): { hour: string; minute: string } {
  if (/^\d{2}:\d{2}$/.test(time)) {
    const [hour, minute] = time.split(":");
    return {
      hour,
      minute: MINUTES.includes(minute) ? minute : "00",
    };
  }

  return { hour: "08", minute: "00" };
}

function normalizeSelectableTime(time: string): string {
  const { hour, minute } = getTimeParts(time);
  return `${hour}:${minute}`;
}

function roundUpToMinuteStep(date: Date): Date {
  const rounded = new Date(date);
  const minute = rounded.getMinutes();
  const remainder = minute % MINUTE_STEP;
  if (remainder > 0) {
    rounded.setMinutes(minute + (MINUTE_STEP - remainder));
  }
  rounded.setSeconds(0, 0);

  return rounded;
}

function getEarliestSelectableTime(date: string): string {
  if (date === formatVietnamDate(new Date())) {
    const suggested = roundUpToMinuteStep(
      new Date(Date.now() + MIN_SCHEDULE_LEAD_MINUTES * 60 * 1000),
    );
    const { hour, minute } = getVietnamTimeParts(suggested);
    return `${hour}:${minute}`;
  }

  return "08:00";
}

function toDateKey(value: string | Date): string {
  if (typeof value === "string") {
    const datePart = value.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
  }

  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getVietnamDayOfWeek(date: string): number {
  const dateKey = toDateKey(date);
  const parsed = new Date(`${dateKey}T12:00:00+07:00`);
  if (Number.isNaN(parsed.getTime())) return -1;
  return parsed.getUTCDay();
}

function isPeakDayMatch(rawPeakDay: unknown, bookingDayOfWeek: number): boolean {
  const peakDay = Number(rawPeakDay);
  if (!Number.isFinite(peakDay)) return false;
  if (peakDay === 7) return true;
  return peakDay === bookingDayOfWeek;
}

function isPeakTimeSlot(
  date: string,
  time: string,
  peakHours: PublicPeakHour[] = [],
): boolean {
  if (!date || peakHours.length === 0) return false;

  const dayOfWeek = getVietnamDayOfWeek(date);
  if (dayOfWeek < 0) return false;

  const selectedDateKey = toDateKey(date);
  const currentMinutes = timeToMinutes(time);

  return peakHours.some((peak) => {
    if (!isPeakDayMatch(peak.dayOfWeek, dayOfWeek)) return false;

    if (peak.startDate && selectedDateKey < toDateKey(peak.startDate)) {
      return false;
    }
    if (peak.endDate && selectedDateKey > toDateKey(peak.endDate)) {
      return false;
    }

    const startMinutes = timeToMinutes(peak.startHour);
    const endMinutes = timeToMinutes(peak.endHour);

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  });
}

function isFullDayPeakWindow(peak: PublicPeakHour): boolean {
  const startMinutes = timeToMinutes(peak.startHour);
  const endMinutes = timeToMinutes(peak.endHour);

  return (
    startMinutes <= SERVICE_DAY_START_MINUTES &&
    endMinutes >= SERVICE_DAY_END_MINUTES
  );
}

function hasFullDayPeakOnDate(
  date: string,
  peakHours: PublicPeakHour[] = [],
): boolean {
  if (!date || peakHours.length === 0) return false;

  const dayOfWeek = getVietnamDayOfWeek(date);
  if (dayOfWeek < 0) return false;

  const selectedDateKey = toDateKey(date);
  return peakHours.some((peak) => {
    if (!isFullDayPeakWindow(peak)) return false;
    if (!isPeakDayMatch(peak.dayOfWeek, dayOfWeek)) return false;
    if (peak.startDate && selectedDateKey < toDateKey(peak.startDate)) {
      return false;
    }
    if (peak.endDate && selectedDateKey > toDateKey(peak.endDate)) {
      return false;
    }

    return true;
  });
}

// ─── Components ───────────────────────────────────────────────────────────────

// Step 0: Chọn gói dịch vụ + gói giờ + dịch vụ thêm
function StepService({
  form,
  onChange,
  lockedServiceId,
}: {
  form: WizardState;
  onChange: (s: Partial<WizardState>) => void;
  lockedServiceId?: string;
}) {
  const { data, isLoading } = usePublicServices();
  const services: ServiceOption[] =
    data?.data.map((service: PublicService) => ({
      id: service.id,
      name: service.name,
      description: service.shortDescription || service.policyDescription,
      maxHours: service.maxHours,
      basePrice:
        (service.durations?.[0]?.durationHours ?? 0) *
          (service.baseHourlyRate ?? 0) ||
        (service.pricingTiers?.[0]?.fixedPrice ??
          (service.pricingTiers?.[0]?.pricePerHour ?? 0) *
            (service.pricingTiers?.[0]?.defaultHours ??
              service.pricingTiers?.[0]?.minHours ??
              1)),
      baseHourlyRate: service.baseHourlyRate ?? 0,
      pricingTiers: service.pricingTiers ?? [],
      durations: service.durations ?? [],
      addons: (service.addons ?? []).filter(isConfiguredAddon),
    })) ?? [];
  const visibleServices = lockedServiceId
    ? services.filter((service) => service.id === lockedServiceId)
    : services;
  const selectedService = services.find((svc) => svc.id === form.serviceId);
  const selectedTier = selectedService?.pricingTiers.find(
    (tier) => tier.id === form.pricingTierId,
  );
  const selectedAddonExtraHours = getSelectedAddonExtraHours(
    selectedService?.addons ?? [],
    form.addonIds,
  );
  const remainingHoursForAddons =
    selectedService?.maxHours != null
      ? selectedService.maxHours -
        (form.durationHours ?? 0) -
        selectedAddonExtraHours
      : null;
  const addonSelectionLocked =
    remainingHoursForAddons != null && remainingHoursForAddons <= 0;
  const addonLockedMessage = selectedService?.maxHours
    ? `Tổng thời lượng công việc đã đạt tối đa (${selectedService.maxHours} giờ) của gói. Vui lòng chọn gói giờ ít hơn hoặc bỏ bớt dịch vụ thêm.`
    : "";

  const handleSelectPackage = (svc: ServiceOption) => {
    const defaultTier = svc.pricingTiers[0];
    const defaultDuration = svc.durations.find((duration) => duration.isPopular) ?? svc.durations[0];
    onChange({
      serviceId: svc.id,
      pricingTierId: defaultTier?.id ?? "",
      durationHours:
        defaultDuration?.durationHours ??
        defaultTier?.defaultHours ??
        defaultTier?.minHours ??
        null,
      areaM2: defaultDuration?.suggestedArea ?? defaultTier?.areaMinM2 ?? null,
      addonIds: [],
    });
  };

  const handleSelectTier = (tier: PublicPricingTier) => {
    const nextDurationHours =
      tier.defaultHours ?? tier.minHours ?? form.durationHours;
    const nextAddonIds = filterAddonsWithinMaxHours(
      selectedService,
      nextDurationHours,
      form.addonIds,
    );
    const droppedCount = form.addonIds.length - nextAddonIds.length;

    onChange({
      pricingTierId: tier.id,
      durationHours: nextDurationHours,
      areaM2: tier.areaMinM2 ?? form.areaM2,
      addonIds: nextAddonIds,
    });

    if (droppedCount > 0) {
      toast.warning(
        `Đã bỏ ${droppedCount} dịch vụ thêm vì vượt quá tổng số giờ tối đa của gói (${selectedService?.maxHours} giờ).`,
      );
    }
  };

  const handleSelectDuration = (duration: PublicDuration) => {
    const nextAddonIds = filterAddonsWithinMaxHours(
      selectedService,
      duration.durationHours,
      form.addonIds,
    );
    const droppedCount = form.addonIds.length - nextAddonIds.length;

    onChange({
      durationHours: duration.durationHours,
      areaM2: duration.suggestedArea ?? form.areaM2,
      addonIds: nextAddonIds,
    });

    if (droppedCount > 0) {
      toast.warning(
        `Đã bỏ ${droppedCount} dịch vụ thêm vì vượt quá tổng số giờ tối đa của gói (${selectedService?.maxHours} giờ).`,
      );
    }
  };

  const toggleAddon = (addonId: string) => {
    const exists = form.addonIds.includes(addonId);
    if (!exists && selectedService?.maxHours != null) {
      const addon = selectedService.addons.find((item) => item.id === addonId);
      const nextTotal =
        getTotalWorkHours(selectedService.addons, form.durationHours, form.addonIds) +
        (addon ? getAddonExtraHours(addon) : 0);
      if (nextTotal > selectedService.maxHours) {
        toast.warning(
          `Không thể thêm "${addon?.name ?? "dịch vụ này"}" vì tổng thời lượng công việc sẽ vượt quá số giờ tối đa của gói (${selectedService.maxHours} giờ).`,
        );
        return;
      }
    }

    onChange({
      addonIds: exists
        ? form.addonIds.filter((id) => id !== addonId)
        : [...form.addonIds, addonId],
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Đang tải dịch vụ...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Chọn gói dịch vụ</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Chọn gói chính, sau đó chọn gói giờ đã setup sẵn và dịch vụ thêm nếu cần.
        </p>
      </div>
      {visibleServices.map((svc) => {
        const selected = form.serviceId === svc.id;
        return (
          <button
            key={svc.id}
            onClick={() => handleSelectPackage(svc)}
            className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
              selected
                ? "border-primary bg-primary/5"
                : "border-border/50 bg-card hover:border-primary/40"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-bold text-sm text-foreground">{svc.name}</p>
                {svc.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {svc.description}
                  </p>
                )}
                <p className="mt-2 text-sm font-black text-primary">
                  Từ {fmtCurrency(svc.basePrice)}
                </p>
              </div>
              {selected && (
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              )}
            </div>
          </button>
        );
      })}

      {lockedServiceId && visibleServices.length === 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Không tìm thấy gói dịch vụ đã chọn. Vui lòng quay lại danh sách dịch vụ và thử lại.
        </div>
      )}

      {selectedService && (
        <div className="space-y-5 rounded-3xl border border-primary/20 bg-primary/5 p-4">
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-black text-foreground">
              <Package className="size-4 text-primary" />
              Chọn gói giờ
            </h3>

            {selectedService.durations.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {selectedService.durations.map((duration) => {
                  const selected = form.durationHours === duration.durationHours;
                  const price =
                    duration.durationHours *
                    selectedService.baseHourlyRate *
                    duration.priceMultiplier;

                  return (
                    <button
                      key={duration.id}
                      type="button"
                      onClick={() => handleSelectDuration(duration)}
                      className={`rounded-2xl border-2 p-4 text-left transition-all ${
                        selected
                          ? "border-primary bg-background shadow-sm"
                          : "border-border/50 bg-background/70 hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-black text-foreground">
                            {duration.title || `${duration.durationHours} giờ`}
                          </p>
                          {duration.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {duration.description}
                            </p>
                          )}
                          <p className="mt-2 text-xs font-semibold text-primary">
                            <Clock className="mr-1 inline size-3" />
                            {duration.durationHours} giờ
                            {duration.suggestedArea ? ` · ${duration.suggestedArea}m²` : ""}
                          </p>
                        </div>
                        {selected && <CheckCircle2 className="size-5 shrink-0 text-primary" />}
                      </div>
                      {price > 0 && (
                        <p className="mt-3 text-sm font-black text-primary">
                          {fmtCurrency(price)}
                        </p>
                      )}
                      {duration.isPopular && (
                        <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black uppercase text-primary">
                          Phổ biến
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : selectedService.pricingTiers.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {selectedService.pricingTiers.map((tier) => {
                  const selected = form.pricingTierId === tier.id;
                  const hours = tier.defaultHours ?? tier.minHours ?? form.durationHours ?? 1;
                  const price =
                    tier.fixedPrice ??
                    (tier.pricePerHour ? tier.pricePerHour * hours : 0);

                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => handleSelectTier(tier)}
                      className={`rounded-2xl border-2 p-4 text-left transition-all ${
                        selected
                          ? "border-primary bg-background shadow-sm"
                          : "border-border/50 bg-background/70 hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-black text-foreground">{tier.name}</p>
                          {tier.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {tier.description}
                            </p>
                          )}
                          <p className="mt-2 text-xs font-semibold text-primary">
                            <Clock className="mr-1 inline size-3" />
                            {hours} giờ
                          </p>
                        </div>
                        {selected && <CheckCircle2 className="size-5 shrink-0 text-primary" />}
                      </div>
                      {price > 0 && (
                        <p className="mt-3 text-sm font-black text-primary">
                          {fmtCurrency(price)}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                Gói này chưa có gói giờ setup sẵn, hệ thống sẽ tính theo dịch vụ con được chọn.
              </p>
            )}

            {selectedTier?.pricingMode === "AREA_HOURLY" && (
              <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
                <label className="text-xs font-black uppercase text-muted-foreground">
                  Diện tích nhà (m²)
                </label>
                <input
                  type="number"
                  min={selectedTier.areaMinM2 ?? 1}
                  max={selectedTier.areaMaxM2 ?? undefined}
                  value={form.areaM2 ?? ""}
                  onChange={(event) =>
                    onChange({
                      areaM2: event.target.value
                        ? Number(event.target.value)
                        : null,
                    })
                  }
                  placeholder="Nhập diện tích nhà"
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Gói này tính giá theo diện tích, vui lòng nhập đúng m² để báo giá chính xác.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-black text-foreground">
              <Sparkles className="size-4 text-primary" />
              Dịch vụ thêm
            </h3>
            {selectedService.addons.length > 0 ? (
              <>
                {addonSelectionLocked && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                    {addonLockedMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {selectedService.addons.map((addon) => {
                    const selected = form.addonIds.includes(addon.id);
                    const extraHours = getAddonExtraHours(addon);
                    const disabled =
                      !selected &&
                      remainingHoursForAddons != null &&
                      extraHours > remainingHoursForAddons;
                    return (
                      <button
                        key={addon.id}
                        type="button"
                        onClick={() => toggleAddon(addon.id)}
                        aria-disabled={disabled}
                        className={`rounded-2xl border p-3 text-left transition-all ${
                          selected
                            ? "border-primary bg-background"
                            : disabled
                              ? "cursor-not-allowed border-border/40 bg-muted/40 opacity-60"
                              : "border-border/50 bg-background/70 hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-foreground">{addon.name}</p>
                            {addon.description && (
                              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                {addon.description}
                              </p>
                            )}
                            {addon.price > 0 && (
                              <p className="mt-2 text-xs font-black text-primary">
                                +{fmtCurrency(addon.price)}
                              </p>
                            )}
                            {extraHours > 0 && (
                              <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                                <Clock className="mr-1 inline size-3" />
                                +{addon.durationMinutes} phút làm việc
                              </p>
                            )}
                          </div>
                          <div
                            className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
                              selected ? "border-primary bg-primary text-white" : "border-border"
                            }`}
                          >
                            {selected && <CheckCircle2 className="size-3.5" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Gói này không có dịch vụ thêm.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Step 1: Chọn địa chỉ bằng GoongMap
function StepAddress({
  form,
  onChange,
}: {
  form: WizardState;
  onChange: (s: Partial<WizardState>) => void;
}) {
  const [isMapOpen, setIsMapOpen] = useState(false);
  const { data: addresses = [], isLoading } = useCustomerAddresses();
  const createAddress = useCreateCustomerAddress();
  // Giữ lại địa chỉ đang chọn trước khi mở map, để đóng map mà không chọn gì
  // thì trả lại lựa chọn cũ thay vì bắt khách chọn lại.
  const selectionBeforeMapRef = useRef<Pick<
    WizardState,
    "addressId" | "selectedAddress" | "selectedLat" | "selectedLng"
  > | null>(null);

  // Tự chọn địa chỉ mặc định khi chưa có lựa chọn nào (không chạy lúc map đang
  // mở — nếu không nó sẽ đè lên trạng thái "đang ghim vị trí mới" của khách).
  useEffect(() => {
    if (isMapOpen || form.addressId || form.selectedAddress || addresses.length === 0) {
      return;
    }
    const defaultAddress = addresses.find((address) => address.isDefault);
    if (!defaultAddress) return;
    onChange({
      addressId: defaultAddress.id,
      selectedAddress: defaultAddress.fullAddress,
      selectedLat: defaultAddress.latitude,
      selectedLng: defaultAddress.longitude,
      hasPet: defaultAddress.hasPet,
    });
  }, [addresses, isMapOpen, form.addressId, form.selectedAddress, onChange]);

  const handleSavedAddressSelect = (addressId: string) => {
    const address = addresses.find((item) => item.id === addressId);
    if (!address) return;

    onChange({
      addressId: address.id,
      selectedAddress: address.fullAddress,
      selectedLat: address.latitude,
      selectedLng: address.longitude,
      hasPet: address.hasPet,
    });
    setIsMapOpen(false);
  };

  const handleMapSelect = (lat: number, lng: number, address: string) => {
    onChange({
      addressId: "",
      selectedLat: lat,
      selectedLng: lng,
      selectedAddress: address,
    });
  };

  const handleAutoSelect = (placeId: string, description: string) => {
    // Gọi Goong Geocode để lấy lat/lng từ place_id
    fetch(
      `https://rsapi.goong.io/Place/Detail?place_id=${placeId}&api_key=${GOONG_API_KEY}`,
    )
      .then((r) => r.json())
      .then((data) => {
        const loc = data?.result?.geometry?.location;
        if (loc) {
          onChange({
            addressId: "",
            selectedAddress: description,
            selectedLat: loc.lat,
            selectedLng: loc.lng,
          });
        } else {
          onChange({ addressId: "", selectedAddress: description });
        }
      })
      .catch(() =>
        onChange({ addressId: "", selectedAddress: description }),
      );
  };

  const handleUseMapAddress = async () => {
    if (
      !form.selectedAddress ||
      form.selectedLat === null ||
      form.selectedLng === null
    ) {
      return;
    }

    try {
      const createdAddress = await createAddress.mutateAsync({
        label: "Địa chỉ đặt lịch",
        fullAddress: form.selectedAddress,
        latitude: form.selectedLat,
        longitude: form.selectedLng,
        hasPet: form.hasPet,
      });
      onChange({
        addressId: createdAddress.id,
        selectedAddress: createdAddress.fullAddress,
        selectedLat: createdAddress.latitude,
        selectedLng: createdAddress.longitude,
      });
      setIsMapOpen(false);
    } catch {
      // Interceptor HTTP đã hiển thị lỗi từ BE.
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-foreground mb-1">
          Vị trí làm việc
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Chọn địa chỉ đã lưu hoặc mở bản đồ để tìm và ghim vị trí mới
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">
          Địa chỉ đã lưu
        </p>
        <Select
          value={form.addressId || undefined}
          onValueChange={handleSavedAddressSelect}
          disabled={isLoading || addresses.length === 0}
        >
          <SelectTrigger className="h-12 rounded-xl">
            <SelectValue
              placeholder={
                isLoading
                  ? "Đang tải địa chỉ..."
                  : addresses.length === 0
                    ? "Chưa có địa chỉ đã lưu"
                    : "Chọn một địa chỉ"
              }
            />
          </SelectTrigger>
          <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]">
            {addresses.map((address) => (
              <SelectItem
                key={address.id}
                value={address.id}
                className="overflow-hidden [&>span:last-child]:min-w-0"
              >
                <span className="block truncate">
                  {address.label || "Địa chỉ"}
                  {address.isDefault ? " · Mặc định" : ""} —{" "}
                  {address.fullAddress}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <button
        type="button"
        onClick={() => {
          setIsMapOpen((current) => !current);
          if (!isMapOpen && form.addressId) {
            // Mở map: snapshot lựa chọn hiện tại rồi mới xóa để ghim vị trí mới.
            selectionBeforeMapRef.current = {
              addressId: form.addressId,
              selectedAddress: form.selectedAddress,
              selectedLat: form.selectedLat,
              selectedLng: form.selectedLng,
            };
            onChange({
              addressId: "",
              selectedAddress: "",
              selectedLat: null,
              selectedLng: null,
            });
          } else if (isMapOpen) {
            // Đóng map mà chưa chốt địa chỉ nào → trả lại lựa chọn trước đó.
            if (!form.addressId && selectionBeforeMapRef.current) {
              onChange(selectionBeforeMapRef.current);
            }
            selectionBeforeMapRef.current = null;
          }
        }}
        className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
          isMapOpen
            ? "border-primary bg-primary/5 text-primary"
            : "border-border/50 text-muted-foreground hover:border-primary/30"
        }`}
      >
        <span className="flex items-center gap-2">
          <MapPinned className="size-4" />
          Tìm kiếm hoặc ghim trên bản đồ
        </span>
        <span>{isMapOpen ? "Đóng" : "Mở"}</span>
      </button>

      <button
        type="button"
        onClick={() => onChange({ hasPet: !form.hasPet })}
        className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
          form.hasPet
            ? "border-primary bg-primary/5 text-primary"
            : "border-border/50 text-muted-foreground hover:border-primary/30"
        }`}
      >
        <span className="flex items-center gap-2">
          <PawPrint className="size-4" />
          Nhà có thú cưng
        </span>
        <span className="text-xs font-black uppercase">
          {form.hasPet ? "Có" : "Không"}
        </span>
      </button>

      {isMapOpen && (
        <div className="space-y-3 rounded-2xl border border-border/50 bg-card p-3">
          <GoongAutocomplete
            onSelect={handleAutoSelect}
            placeholder="Tìm địa chỉ tại Hà Nội..."
            className="z-30"
          />

          <div className="overflow-hidden rounded-2xl border border-border/50 shadow-sm">
            <GoongMap
              key={`${form.selectedLat ?? 21.028511}-${form.selectedLng ?? 105.804817}`}
              initialLat={form.selectedLat ?? 21.028511}
              initialLng={form.selectedLng ?? 105.804817}
              onLocationSelect={handleMapSelect}
            />
          </div>

          <Button
            type="button"
            className="w-full rounded-xl"
            onClick={handleUseMapAddress}
            disabled={
              !form.selectedAddress ||
              form.selectedLat === null ||
              form.selectedLng === null ||
              createAddress.isPending
            }
          >
            {createAddress.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
            {createAddress.isPending
              ? "Đang lưu vị trí..."
              : "Sử dụng vị trí này"}
          </Button>
        </div>
      )}

      {form.addressId && form.selectedAddress && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-start gap-2">
          <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-primary mb-0.5">
              Vị trí đã chọn
            </p>
            <p className="text-sm text-foreground">{form.selectedAddress}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Step 2: Chọn lịch
function StepSchedule({
  form,
  onChange,
}: {
  form: WizardState;
  onChange: (s: Partial<WizardState>) => void;
}) {
  const days = getNext7Days();
  const { data: publicServicesData } = usePublicServices();
  const selectedPackage = publicServicesData?.data.find(
    (pkg) => pkg.id === form.serviceId,
  );
  const peakHours = selectedPackage?.peakHours ?? [];
  const selectedTimeParts = getTimeParts(form.scheduledTime);
  const selectedTimeIsPeak = isPeakTimeSlot(
    form.scheduledDate,
    form.scheduledTime,
    peakHours,
  );

  const handleDateSelect = (date: string) => {
    if (isPastDate(date)) {
      toast.error("Không thể chọn ngày trong quá khứ");
      return;
    }

    const currentTimeIsTooSoon =
      form.scheduledTime &&
      isBeforeMinimumScheduleLead(date, form.scheduledTime);
    const nextTime =
      !form.scheduledTime || currentTimeIsTooSoon
        ? getEarliestSelectableTime(date)
        : normalizeSelectableTime(form.scheduledTime);

    onChange({
      scheduledDate: date,
      scheduledTime: nextTime,
    });

    if (currentTimeIsTooSoon) {
      toast.warning(
        "Khung giờ đã chọn cần cách hiện tại tối thiểu 1 tiếng.",
      );
    }
  };

  const handleTimeSelect = (time: string) => {
    if (!form.scheduledDate) {
      toast.info("Vui lòng chọn ngày trước");
      return;
    }
    if (isBeforeMinimumScheduleLead(form.scheduledDate, time)) {
      toast.error(
        "Vui lòng chọn thời gian cách hiện tại tối thiểu 1 tiếng để tasker chuẩn bị.",
      );
      return;
    }

    onChange({ scheduledTime: time });
  };

  const handleTimePartSelect = (part: "hour" | "minute", value: string) => {
    const nextTime =
      part === "hour"
        ? `${value}:${selectedTimeParts.minute}`
        : `${selectedTimeParts.hour}:${value}`;
    handleTimeSelect(nextTime);
  };

  const handleEarliestTimeSelect = () => {
    if (!form.scheduledDate) {
      toast.info("Vui lòng chọn ngày trước");
      return;
    }

    handleTimeSelect(getEarliestSelectableTime(form.scheduledDate));
  };

  return (
    <div className="space-y-5">
      <div className="bg-card p-5 rounded-2xl border border-border/50 space-y-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" /> Chọn ngày
        </h2>

        <div className="flex items-center gap-5 rounded-2xl border border-border/60 bg-background px-4 py-3 text-xs font-semibold text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500" />
            Hôm nay
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-amber-400" />
            Ngày cao điểm
          </span>
        </div>

        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
          {days.map((d) => {
            const selected = form.scheduledDate === d.date;
            const past = isPastDate(d.date);
            const today = d.date === formatVietnamDate(new Date());
            const peak = hasFullDayPeakOnDate(d.date, peakHours);
            return (
              <button
                key={d.date}
                onClick={() => handleDateSelect(d.date)}
                aria-disabled={past}
                className={`relative flex h-[90px] w-[58px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border transition-all ${
                  selected
                    ? "border-primary bg-primary text-white shadow-md shadow-primary/30"
                    : past
                      ? "cursor-not-allowed border-border/30 bg-muted/40 text-muted-foreground/50"
                    : "border-border/60 bg-background text-muted-foreground hover:border-primary/40"
                }`}
              >
                <span className="text-xs font-bold">{d.weekday}</span>
                <span className="text-2xl font-black leading-none">
                  {d.dayOfMonth}
                </span>
                {(today || peak) && !past && (
                  <span
                    className={`absolute bottom-2 size-2 rounded-full ${
                      today ? "bg-emerald-500" : "bg-amber-400"
                    } ${selected ? "ring-2 ring-white/80" : ""}`}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-border/60 bg-background p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Chọn giờ làm
            </div>

            <div className="flex h-12 w-[150px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-primary/45 bg-background px-2">
              <Select
                value={selectedTimeParts.hour}
                onValueChange={(value) =>
                  handleTimePartSelect("hour", value)
                }
              >
                <SelectTrigger
                  aria-label="Giờ"
                  className="relative h-10 min-w-0 flex-1 justify-center rounded-lg border-0 bg-transparent px-1 pr-5 text-center text-base font-black shadow-none hover:bg-primary/5 focus:ring-2 focus:ring-primary/15 [&>svg]:absolute [&>svg]:right-1 [&>svg]:top-1/2 [&>svg]:size-3.5 [&>svg]:-translate-y-1/2 [&_[data-slot=select-value]]:justify-center [&_[data-slot=select-value]]:font-black"
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

              <span className="text-lg font-black text-foreground">
                :
              </span>

              <Select
                value={selectedTimeParts.minute}
                onValueChange={(value) =>
                  handleTimePartSelect("minute", value)
                }
              >
                <SelectTrigger
                  aria-label="Phút"
                  className="relative h-10 min-w-0 flex-1 justify-center rounded-lg border-0 bg-transparent px-1 pr-5 text-center text-base font-black shadow-none hover:bg-primary/5 focus:ring-2 focus:ring-primary/15 [&>svg]:absolute [&>svg]:right-1 [&>svg]:top-1/2 [&>svg]:size-3.5 [&>svg]:-translate-y-1/2 [&_[data-slot=select-value]]:justify-center [&_[data-slot=select-value]]:font-black"
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
        </div>

        <button
          type="button"
          onClick={handleEarliestTimeSelect}
          className="rounded-lg border border-border/70 bg-background px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          Sớm nhất có thể
        </button>

        {selectedTimeIsPeak && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 fill-amber-400 text-amber-500" />
            <p>
              Giá tăng do nhu cầu công việc tăng cao vào thời điểm này.
            </p>
          </div>
        )}
      </div>

      <div className="bg-card p-5 rounded-2xl border border-border/50">
        <h2 className="text-base font-bold text-foreground mb-3">
          Ghi chú cho Tasker
        </h2>
        <textarea
          value={form.note}
          onChange={(e) => onChange({ note: e.target.value })}
          placeholder="Nhà có vật nuôi, dị ứng hóa chất..."
          rows={3}
          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:ring-2 focus:ring-primary/30 outline-none resize-none"
        />
      </div>
    </div>
  );
}

// Step 2: Địa chỉ + Thanh toán
function StepPayment({
  form,
  onChange,
  packageId,
  walletBalance,
  isWalletLoading,
  estimatedTotalPrice,
  isWalletShort,
}: {
  form: WizardState;
  onChange: (s: Partial<WizardState>) => void;
  packageId?: string;
  walletBalance: number;
  isWalletLoading: boolean;
  estimatedTotalPrice: number | null;
  isWalletShort: boolean;
}) {
  const METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
    { value: "CASH", label: "Tiền mặt", icon: "💵" },
    { value: "WALLET", label: "Ví CleanZ", icon: "💳" },
    { value: "ADYEN", label: "Chuyển khoản", icon: "🏦" },
  ];
  const { data: adyenCards } = useMyCards(form.paymentMethod === "ADYEN");
  const removeAdyenCard = useRemoveCard();

  return (
    <div className="space-y-5">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <MapPin className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm text-amber-800">Địa chỉ đã chọn</p>
          <p className="text-xs text-amber-700 mt-0.5">
            {form.selectedAddress}
          </p>
        </div>
      </div>

      <div className="bg-card p-5 rounded-2xl border border-border/50">
        <h2 className="text-base font-bold text-foreground mb-4">
          Phương thức thanh toán
        </h2>
        <div className="space-y-2">
          {METHODS.map((m) => {
            const selected = form.paymentMethod === m.value;
            return (
              <button
                key={m.value}
                onClick={() => onChange({ paymentMethod: m.value })}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border/50 hover:border-primary/30"
                }`}
              >
                <span className="text-xl">{m.icon}</span>
                <span className="flex flex-col items-start">
                  <span
                    className={`font-semibold text-sm ${selected ? "text-primary" : "text-foreground"}`}
                  >
                    {m.label}
                  </span>
                  {m.value === "WALLET" && (
                    <span className="text-xs text-muted-foreground">
                      {isWalletLoading
                        ? "Đang tải số dư..."
                        : `Số dư: ${fmtCurrency(walletBalance)}`}
                    </span>
                  )}
                </span>
                {selected && (
                  <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />
                )}
              </button>
            );
          })}
        </div>

        {isWalletShort && estimatedTotalPrice !== null && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-700">
                  Số dư Ví CleanZ không đủ
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  Đơn tạm tính {fmtCurrency(estimatedTotalPrice)}, bạn thiếu{" "}
                  <span className="font-bold">
                    {fmtCurrency(estimatedTotalPrice - walletBalance)}
                  </span>
                  . Nạp thêm tiền hoặc chọn Tiền mặt để tiếp tục.
                </p>
              </div>
            </div>
            <Link
              href="/customer/wallet"
              className="block w-full rounded-lg bg-red-600 py-2 text-center text-xs font-bold text-white"
            >
              Nạp tiền ngay
            </Link>
          </div>
        )}

        {form.paymentMethod === "ADYEN" && (
          <div className="mt-3">
            <SavedCardPicker
              cards={adyenCards}
              selectedId={form.adyenCardId}
              onSelect={(id) => onChange({ adyenCardId: id })}
              onRemove={(id) => removeAdyenCard.mutate(id)}
              isRemoving={removeAdyenCard.isPending}
              emptyHint="Bạn sẽ nhập thông tin thẻ ở bước xác nhận (sandbox). Thẻ được lưu lại để lần sau chỉ cần chọn."
            />
          </div>
        )}
      </div>

      <div className="bg-card p-5 rounded-2xl border border-border/50">
        <h2 className="text-base font-bold text-foreground mb-3">
          Voucher giảm giá (tuỳ chọn)
        </h2>
        <VoucherPickerSheet
          packageId={packageId}
          selectedCode={form.voucherCode}
          onSelect={(code) => onChange({ voucherCode: code })}
        />
      </div>
    </div>
  );
}

// Step 3: Xem báo giá + xác nhận
function StepConfirm({
  form,
  quote,
  isQuoting,
  walletBalance,
  isWalletInsufficient,
}: {
  form: WizardState;
  quote: BookingQuoteResponse | null;
  isQuoting: boolean;
  walletBalance: number;
  isWalletInsufficient: boolean;
}) {
  if (isQuoting) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Đang tính giá...</p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <p className="text-sm font-bold text-red-700">Không thể lấy báo giá</p>
        <p className="text-xs text-red-600 mt-1">
          Kiểm tra lại địa chỉ mặc định và thử lại
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Service + Schedule summary */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-2">
        <h3 className="font-bold text-sm mb-1">Tóm tắt đơn</h3>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Dịch vụ</span>
          <span className="font-semibold">{quote.service.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Thời gian</span>
          <span className="font-semibold">
            {form.scheduledDate} · {form.scheduledTime}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Thời lượng</span>
          <span className="font-semibold">{quote.schedule.durationHours}h</span>
        </div>
        {quote.addons && quote.addons.length > 0 && (
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-muted-foreground">Dịch vụ thêm</span>
            <span className="max-w-[60%] text-right font-semibold">
              {quote.addons.map((addon) => addon.name).join(", ")}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Địa chỉ</span>
          <span className="font-semibold text-right max-w-[60%] line-clamp-2">
            {quote.address.fullAddress}
          </span>
        </div>
        {quote.address.hasPet && (
          <p className="text-xs text-amber-600">🐾 Có tính phí thú cưng</p>
        )}
      </div>

      {/* Price breakdown */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-2">
        <h3 className="font-bold text-sm mb-1">Chi tiết giá</h3>
        {[
          { label: "Giá cơ bản", value: quote.price.basePrice },
          { label: "Phụ phí", value: quote.price.addonPrice ?? 0 },
          { label: "Phí cao điểm", value: quote.price.peakFee },
          { label: "Phí thú cưng", value: quote.price.petFee },
          { label: "Giảm giá", value: -quote.price.discountAmount },
        ]
          .filter((r) => r.value !== 0)
          .map((r) => (
            <div key={r.label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{r.label}</span>
              <span
                className={r.value < 0 ? "text-emerald-600 font-medium" : ""}
              >
                {r.value < 0 ? "-" : ""}
                {fmtCurrency(Math.abs(r.value))}
              </span>
            </div>
          ))}
        <div className="flex justify-between pt-3 border-t border-border/40">
          <span className="font-bold">Tổng thanh toán</span>
          <span className="font-black text-primary text-base">
            {fmtCurrency(quote.price.totalPrice)}
          </span>
        </div>
        <div className="flex justify-between text-sm pt-1">
          <span className="text-muted-foreground">Phương thức</span>
          <span className="font-semibold">
            {form.paymentMethod === "WALLET"
              ? "Ví CleanZ"
              : form.paymentMethod === "ADYEN"
                ? "Chuyển khoản"
                : "Tiền mặt"}
          </span>
        </div>
      </div>

      {isWalletInsufficient && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-700">
                Số dư Ví CleanZ không đủ
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                Bạn đang thiếu{" "}
                <span className="font-bold">
                  {fmtCurrency(quote.price.totalPrice - walletBalance)}
                </span>{" "}
                (số dư: {fmtCurrency(walletBalance)}). Vui lòng nạp thêm tiền
                hoặc quay lại chọn phương thức thanh toán khác.
              </p>
            </div>
          </div>
          <Link
            href="/customer/wallet"
            className="block w-full rounded-lg bg-red-600 py-2 text-center text-xs font-bold text-white"
          >
            Nạp tiền ngay
          </Link>
        </div>
      )}

      {/* Voucher */}
      {quote.voucher && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <div>
            <p className="text-xs font-bold text-emerald-700">
              Voucher {quote.voucher.code} đã áp dụng
            </p>
            <p className="text-xs text-emerald-600">{quote.voucher.name}</p>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Bằng cách đặt lịch, bạn đồng ý với điều khoản dịch vụ CleanZ
      </p>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────
export const BookingWizard = ({
  serviceId: initialServiceId,
}: {
  serviceId?: string;
}) => {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<WizardState>({
    ...INIT_STATE,
    serviceId: initialServiceId ?? "",
  });
  const [quote, setQuote] = useState<BookingQuoteResponse | null>(null);
  const [createdId, setCreatedId] = useState<string>("");

  const { data: publicServicesData, isLoading: isServicesLoading } = usePublicServices();
  const [resolvedServiceId, setResolvedServiceId] = useState<string | null>(null);

  const parentPackage = useMemo(() => {
    if (!initialServiceId || !publicServicesData?.data) return null;
    return (
      publicServicesData.data.find((pkg) => pkg.id === initialServiceId) ??
      null
    );
  }, [initialServiceId, publicServicesData]);

  useEffect(() => {
    if (!parentPackage || resolvedServiceId === parentPackage.id) return;

    const defaultTier = parentPackage.pricingTiers?.[0];
    const defaultDuration =
      parentPackage.durations?.find((duration) => duration.isPopular) ??
      parentPackage.durations?.[0];

    const timeoutId = window.setTimeout(() => {
      setResolvedServiceId(parentPackage.id);
      setForm((prev) => ({
        ...prev,
        serviceId: parentPackage.id,
        pricingTierId: defaultTier?.id ?? "",
        durationHours:
          defaultDuration?.durationHours ??
          defaultTier?.defaultHours ??
          defaultTier?.minHours ??
          prev.durationHours,
        areaM2: defaultDuration?.suggestedArea ?? defaultTier?.areaMinM2 ?? prev.areaM2,
        addonIds: [],
      }));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [initialServiceId, parentPackage, resolvedServiceId]);

  const quoteQuery = useBookingQuote();
  const createMutation = useCreateBooking();
  const createAdyenSessionMutation = useCreateAdyenBookingSession();
  const [adyenSession, setAdyenSession] =
    useState<AdyenBookingCheckoutSession | null>(null);
  const [showAdyenDropin, setShowAdyenDropin] = useState(false);
  const {
    data: wallet,
    isLoading: isWalletLoading,
    isFetching: isWalletFetching,
  } = useCustomerWallet();
  const walletBalance = wallet?.balance ?? 0;

  // Quote tạm tính chỉ chạy ở bước Thanh toán khi chọn Ví CleanZ — để cảnh báo
  // thiếu tiền ngay tại chỗ chọn ví (bước này chưa có quote chính thức).
  const walletPreviewQuote = useBookingQuoteQuery(
    {
      packageId: form.serviceId || undefined,
      addonIds: form.addonIds.length > 0 ? form.addonIds : undefined,
      addressId: form.addressId || undefined,
      scheduledDate: form.scheduledDate,
      scheduledTime: form.scheduledTime,
      voucherCode: form.voucherCode || undefined,
      pricingTierId: form.pricingTierId || undefined,
      durationHours: form.durationHours ?? undefined,
      areaM2: form.areaM2 ?? undefined,
      hasPet: form.hasPet,
    },
    step === 3 && form.paymentMethod === "WALLET",
  );
  const estimatedTotalPrice =
    walletPreviewQuote.data?.price.totalPrice ?? null;
  const isWalletValidationPending =
    form.paymentMethod === "WALLET" &&
    (isWalletLoading ||
      isWalletFetching ||
      walletPreviewQuote.isFetching ||
      estimatedTotalPrice === null);
  const isWalletShortAtPayment =
    form.paymentMethod === "WALLET" &&
    estimatedTotalPrice !== null &&
    walletBalance < estimatedTotalPrice;
  const isWalletInsufficient =
    form.paymentMethod === "WALLET" &&
    !!quote &&
    walletBalance < quote.price.totalPrice;
  const selectedBookingPackage = publicServicesData?.data.find(
    (pkg) => pkg.id === form.serviceId,
  );
  const selectedBookingTier = selectedBookingPackage?.pricingTiers?.find(
    (tier) => tier.id === form.pricingTierId,
  );
  const selectedBookingDuration = selectedBookingPackage?.durations?.find(
    (duration) => duration.durationHours === form.durationHours,
  );
  const totalBookingWorkHours = getTotalWorkHours(
    selectedBookingPackage?.addons ?? [],
    form.durationHours,
    form.addonIds,
  );
  const addonSelectionInvalidAtMaxHours =
    selectedBookingPackage?.maxHours != null &&
    totalBookingWorkHours > selectedBookingPackage.maxHours;

  const update = (partial: Partial<WizardState>) =>
    setForm((prev) => ({ ...prev, ...partial }));

  const canProceed = (): boolean => {
    if (step === 0)
      return (
        !!form.serviceId &&
        ((form.durationHours ?? 0) > 0 || !!form.pricingTierId) &&
        (selectedBookingTier?.pricingMode !== "AREA_HOURLY" ||
          !!form.areaM2 ||
          !!selectedBookingDuration?.suggestedArea) &&
        !addonSelectionInvalidAtMaxHours
      );
    if (step === 1) return !!form.addressId;
    if (step === 2)
      return (
        !!form.scheduledDate &&
        !!form.scheduledTime &&
        !isBeforeMinimumScheduleLead(form.scheduledDate, form.scheduledTime)
      );
    if (step === 3)
      return !isWalletValidationPending && !isWalletShortAtPayment;
    if (step === 4) return !!quote && !isWalletInsufficient;
    return true;
  };

  const buildCreateDto = (
    extra: Partial<CreateBookingDto> = {},
  ): CreateBookingDto => ({
    packageId: form.serviceId || undefined,
    addonIds: form.addonIds.length > 0 ? form.addonIds : undefined,
    addressId: form.addressId || undefined,
    scheduledDate: form.scheduledDate,
    scheduledTime: form.scheduledTime,
    note: form.note || undefined,
    paymentMethod: form.paymentMethod,
    voucherCode: form.voucherCode || undefined,
    pricingTierId: form.pricingTierId || undefined,
    durationHours: form.durationHours ?? undefined,
    areaM2: form.areaM2 ?? undefined,
    hasPet: form.hasPet,
    quoteId: quote?.quoteId,
    ...extra,
  });

  const submitBooking = async (dto: CreateBookingDto) => {
    try {
      const result = await createMutation.mutateAsync(dto);
      if (result.id) setCreatedId(result.id as string);
      setShowAdyenDropin(false);
      setAdyenSession(null);
      setStep(5);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const responseMessage = error.response.data?.message;
        const bookingId =
          typeof responseMessage === "object" &&
          responseMessage !== null &&
          "bookingId" in responseMessage
            ? String(responseMessage.bookingId)
            : null;

        if (bookingId) {
          router.push(`/customer/booking/${bookingId}`);
          return;
        }
      }

      // Báo giá hết hạn (410) hoặc thông tin đặt lịch đã đổi so với báo giá (400)
      // → quay lại bước xác nhận và lấy báo giá mới thay vì để khách bấm lại vô ích.
      if (
        axios.isAxiosError(error) &&
        (error.response?.status === 410 || error.response?.status === 400)
      ) {
        const message =
          typeof error.response.data?.message === "string"
            ? error.response.data.message
            : "Báo giá đã thay đổi, vui lòng thử lại.";
        toast.error(message);
        setQuote(null);
        setShowAdyenDropin(false);
        setAdyenSession(null);
        setStep(3);
      }
    }
  };

  const adyenDropinRef = useAdyenDropin({
    sessionId: adyenSession?.adyenSessionId ?? "",
    sessionData: adyenSession?.adyenSessionData ?? "",
    clientKey: adyenSession?.adyenClientKey ?? "",
    environment: process.env.NEXT_PUBLIC_ADYEN_ENVIRONMENT,
    onCompleted: ({ sessionId, sessionResult }) => {
      if (!adyenSession) return;
      void submitBooking(
        buildCreateDto({
          id: adyenSession.bookingId,
          adyenSessionId: sessionId,
          adyenSessionResult: sessionResult,
        }),
      );
    },
    onError: (message) => toast.error(message),
  });

  const handleNext = async () => {
    if (step === 0 && addonSelectionInvalidAtMaxHours) {
      toast.warning(
        `Tổng thời lượng công việc (${totalBookingWorkHours}h) vượt quá số giờ tối đa của gói (${selectedBookingPackage?.maxHours}h). Vui lòng bớt dịch vụ thêm hoặc chọn gói giờ ít hơn.`,
      );
      return;
    }

    if (
      step === 2 &&
      form.scheduledDate &&
      form.scheduledTime &&
      isBeforeMinimumScheduleLead(form.scheduledDate, form.scheduledTime)
    ) {
      toast.error(
        "Thời gian đặt lịch phải cách hiện tại tối thiểu 1 tiếng.",
      );
      return;
    }

    // Step 3 (Thanh toán) → Gọi quote API → Step 4 (Xác nhận)
    if (step === 3) {
      if (isWalletValidationPending || isWalletShortAtPayment) return;

      try {
        const result = await quoteQuery.mutateAsync({
          packageId: form.serviceId || undefined,
          addonIds: form.addonIds.length > 0 ? form.addonIds : undefined,
          addressId: form.addressId || undefined,
          scheduledDate: form.scheduledDate,
          scheduledTime: form.scheduledTime,
          note: form.note || undefined,
          voucherCode: form.voucherCode || undefined,
          pricingTierId: form.pricingTierId || undefined,
          durationHours: form.durationHours ?? undefined,
          areaM2: form.areaM2 ?? undefined,
          hasPet: form.hasPet,
        });

        // Quote chính thức là nguồn dữ liệu cuối cùng trước khi sang bước xác nhận.
        // Không dựa riêng vào preview vì giá có thể vừa thay đổi trong lúc gọi API.
        if (
          form.paymentMethod === "WALLET" &&
          walletBalance < result.price.totalPrice
        ) {
          toast.error(
            "Số dư Ví CleanZ không đủ. Vui lòng nạp thêm tiền hoặc chọn Tiền mặt.",
          );
          return;
        }

        setQuote(result);
        setStep(4);
      } catch {
  
      }
      return;
    }

    // Step 4 (Xác nhận) → Submit booking → Step 5 (Thành công)
    if (step === 4) {
      // Chuyển khoản + thẻ mới: thanh toán xong (Drop-in) mới tạo booking —
      // không tạo đơn treo. Tạo session trước, chưa gọi createMutation.
      if (form.paymentMethod === "ADYEN" && form.adyenCardId === "new") {
        if (!quote?.quoteId) return;
        try {
          const session = await createAdyenSessionMutation.mutateAsync(
            quote.quoteId,
          );
          setAdyenSession(session);
          setShowAdyenDropin(true);
        } catch {
          // Lỗi đã toast trong hook useCreateAdyenBookingSession.
        }
        return;
      }

      await submitBooking(
        buildCreateDto(
          form.paymentMethod === "ADYEN" && form.adyenCardId !== "new"
            ? { adyenStoredPaymentMethodId: form.adyenCardId }
            : {},
        ),
      );
      return;
    }

    setStep((s) => Math.min(s + 1, 5) as Step);
  };

  const handleBack = () => {
    if (step === 0) router.back();
    else setStep((s) => Math.max(s - 1, 0) as Step);
  };

  const STEP_TITLES = [
    "Chọn gói dịch vụ",
    "Vị trí làm việc",
    "Lịch & Ghi chú",
    "Thanh toán",
    "Xác nhận đơn",
    "Thành công!",
  ];

  const STEP_BAR_LABELS = [
    "Gói",
    "Địa chỉ",
    "Lịch",
    "Thanh toán",
    "Xác nhận",
    "✓",
  ];

  const isPending =
    (step === 3 && quoteQuery.isPending) ||
    (step === 4 &&
      (createMutation.isPending || createAdyenSessionMutation.isPending));

  const isResolvingPackage = !!initialServiceId && !form.serviceId;

  if (initialServiceId && (isServicesLoading || isResolvingPackage)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Đang xử lý dịch vụ...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="bg-card px-4 pt-12 pb-4 sticky top-0 z-20 shadow-sm flex items-center gap-3">
        <button
          onClick={handleBack}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-foreground flex-1">
          {STEP_TITLES[step]}
        </h1>
        {step < 5 && (
          <span className="text-xs text-muted-foreground">
            {step + 1}/{STEP_BAR_LABELS.length}
          </span>
        )}
      </div>

      {/* Step indicator bar */}
      {step < 5 && (
        <div className="px-4 pt-4">
          <div className="flex gap-1.5">
            {STEP_BAR_LABELS.map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-full transition-all ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 pt-6 lg:px-8">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="s0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <StepService
                form={form}
                onChange={update}
                lockedServiceId={initialServiceId}
              />
            </motion.div>
          )}
          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <StepAddress form={form} onChange={update} />
            </motion.div>
          )}
          {step === 2 && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <StepSchedule form={form} onChange={update} />
            </motion.div>
          )}
          {step === 3 && (
            <motion.div
              key="s3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <StepPayment
                form={form}
                onChange={update}
                packageId={form.serviceId || undefined}
                walletBalance={walletBalance}
                isWalletLoading={isWalletLoading}
                estimatedTotalPrice={estimatedTotalPrice}
                isWalletShort={isWalletShortAtPayment}
              />
            </motion.div>
          )}
          {step === 4 && (
            <motion.div
              key="s4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {showAdyenDropin && adyenSession ? (
                <div className="space-y-4">
                  <div className="bg-card p-5 rounded-2xl border border-border/50">
                    <h2 className="text-base font-bold text-foreground mb-4">
                      Nhập thông tin thẻ
                    </h2>
                    <div ref={adyenDropinRef} />
                    {createMutation.isPending && (
                      <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Đang xác nhận thanh toán và tạo booking...
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setShowAdyenDropin(false);
                      setAdyenSession(null);
                    }}
                    disabled={createMutation.isPending}
                    className="w-full bg-muted text-foreground font-bold py-3.5 rounded-2xl disabled:opacity-40"
                  >
                    Quay lại chọn phương thức
                  </button>
                </div>
              ) : (
                <StepConfirm
                  form={form}
                  quote={quote}
                  isQuoting={quoteQuery.isPending}
                  walletBalance={walletBalance}
                  isWalletInsufficient={isWalletInsufficient}
                />
              )}
            </motion.div>
          )}
          {step === 5 && (
            <motion.div
              key="s5"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center bg-card p-10 rounded-3xl border border-border/50 mt-8 shadow-lg"
            >
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-black text-foreground mb-2">
                Đặt lịch thành công!
              </h2>
              <p className="text-sm text-muted-foreground mb-8">
                Hệ thống đang tìm Tasker phù hợp trong khu vực của bạn. Bạn sẽ
                được thông báo khi có Tasker nhận đơn.
              </p>
              <div className="space-y-3">
                {createdId && (
                  <button
                    onClick={() =>
                      router.push(`/customer/booking/${createdId}`)
                    }
                    className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/30"
                  >
                    Xem chi tiết đơn hàng
                  </button>
                )}
                <button
                  onClick={() => router.push("/customer/history")}
                  className="w-full bg-muted text-foreground font-bold py-3.5 rounded-2xl"
                >
                  Về trang Hoạt động
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      {step < 5 && !showAdyenDropin && (
        <div className="fixed bottom-20 md:bottom-0 left-0 right-0 bg-card border-t border-border/40 p-4 z-30">
          <div className="mx-auto max-w-5xl">
            <button
              onClick={handleNext}
              disabled={!canProceed() || isPending}
              className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/30 hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {step === 4
                    ? form.paymentMethod === "ADYEN" && form.adyenCardId === "new"
                      ? "Tiếp tục nhập thẻ"
                      : "Xác nhận & Đặt lịch"
                    : "Tiếp tục"}
                  {step < 4 && <ChevronRight className="w-5 h-5" />}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
