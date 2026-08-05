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
  Phone,
  User,
  ShieldCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { GoongMap } from "@/components/maps/GoongMap";
import { GoongAutocomplete } from "@/components/maps/GoongAutocomplete";
import { GOONG_API_KEY } from "@/lib/maps/goong-config";
import {
  useBookingQuote,
  useBookingQuoteQuery,
  useCreateBooking,
  useCustomerSchedulingPolicy,
} from "@/features/booking/hooks/useCustomerBooking";
import { QRCodeSVG } from "qrcode.react";
import { OnlinePaymentPanel } from "@/features/booking/_components/OnlinePaymentPanel";
import { useCustomerWallet } from "@/features/customer/wallet/hooks/useCustomerWallet";
import { VoucherPickerSheet } from "@/features/customer/vouchers/VoucherPickerSheet";
import type {
  BookingServiceTier,
  BookingQuoteResponse,
  CreateBookingDto,
  PaymentMethod,
} from "@/features/booking/types/booking.types";
import { FavoriteTaskerPicker } from "@/features/booking/components/wizard/FavoriteTaskerPicker";
import { ServiceTierSelector } from "@/features/booking/components/wizard/ServiceTierSelector";
import { usePublicServices } from "@/features/services/hooks/usePublicServices";
import { useProfile } from "@/features/auth/hooks/auth.hooks";
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
import { toast } from "@/lib/toast";
import axios from "axios";
import {
  DEFAULT_MIN_SCHEDULE_LEAD_MINUTES,
  getEarliestAvailableSchedule,
  MINUTE_STEP,
} from "@/features/customer/booking/utils/booking-schedule-time";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ServiceOption {
  id: string;
  name: string;
  description?: string | null;
  pricingMode?: string | null;
  maxHours: number | null;
  baseHourlyRate: number;
  premiumHourlyRate: number;
  pricingTiers: PublicPricingTier[];
  durations: PublicDuration[];
  addons: PublicAddon[];
}

// 0=Dịch vụ, 1=Địa chỉ, 2=Lịch, 3=Thanh toán, 4=Xác nhận, 5=Thành công
type Step = 0 | 1 | 2 | 3 | 4 | 5;

interface WizardState {
  serviceId: string; // ServicePackage ID
  pricingTierId: string;
  durationHours: number | null;
  durationMode: "preset" | "custom";
  areaM2: number | null;
  addonIds: string[]; // Option/dịch vụ thêm IDs chọn thêm
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
  // Hạng dịch vụ
  serviceTier: BookingServiceTier;
  preferredTaskerId?: string;
  // Thanh toán
  paymentMethod: PaymentMethod;
  voucherCode: string;
  contactPhone?: string;
}

const INIT_STATE: WizardState = {
  serviceId: "",
  pricingTierId: "",
  durationHours: null,
  durationMode: "preset",
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
  serviceTier: "STANDARD",
  preferredTaskerId: undefined,
  paymentMethod: "CASH",
  voucherCode: "",
  contactPhone: undefined,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCurrency(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

function hasPremiumPrice(service: ServiceOption): boolean {
  return (
    service.baseHourlyRate > 0 &&
    service.premiumHourlyRate > 0 &&
    service.premiumHourlyRate >= service.baseHourlyRate
  );
}

function applyServiceTierPrice(
  standardPrice: number,
  service: ServiceOption,
  serviceTier: BookingServiceTier,
): number | null {
  if (serviceTier === "STANDARD") return Math.round(standardPrice);
  if (!hasPremiumPrice(service)) return null;

  return Math.round(
    standardPrice * (service.premiumHourlyRate / service.baseHourlyRate),
  );
}

function getDurationStandardPrice(
  service: ServiceOption,
  duration: PublicDuration,
): number {
  if (duration.priceMode === "fixed" && (duration.fixedPrice ?? 0) > 0) {
    return Number(duration.fixedPrice);
  }

  return (
    duration.durationHours * service.baseHourlyRate * duration.priceMultiplier
  );
}

function getPricingTierStandardPrice(
  tier: PublicPricingTier,
  fallbackHours = 1,
): number {
  const hours = tier.defaultHours ?? tier.minHours ?? fallbackHours;
  return tier.fixedPrice ?? (tier.pricePerHour ? tier.pricePerHour * hours : 0);
}

function getCustomDurationStandardPrice(
  service: ServiceOption,
  tier: PublicPricingTier | undefined,
  durationHours: number,
  areaM2: number | null,
): number {
  if (tier?.pricingMode === "FIXED") {
    return tier.fixedPrice ?? 0;
  }
  if (tier?.pricingMode === "AREA_HOURLY") {
    return (tier.pricePerM2 ?? 0) * (areaM2 ?? 0) * durationHours;
  }

  return (tier?.pricePerHour ?? service.baseHourlyRate) * durationHours;
}

function getServiceStartingStandardPrice(service: ServiceOption): number {
  const firstDuration = service.durations[0];
  if (firstDuration) return getDurationStandardPrice(service, firstDuration);

  const firstTier = service.pricingTiers[0];
  return firstTier ? getPricingTierStandardPrice(firstTier) : 0;
}

function formatVietnamDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function getScheduleDays(maxAdvanceDays: number) {
  const days = [];
  for (let i = 0; i < maxAdvanceDays; i++) {
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
const CUSTOMER_MIN_DURATION_MINUTES = 60;
const CUSTOMER_DURATION_STEP_MINUTES = 15;
const SERVICE_DAY_START_MINUTES = 6 * 60;
const SERVICE_DAY_END_MINUTES = 23 * 60;

function durationHoursToMinutes(durationHours: number): number {
  return Math.round(durationHours * 60);
}

function isValidCustomerDurationHours(
  durationHours: number | null,
  maxHours?: number | null,
): durationHours is number {
  if (durationHours === null || !Number.isFinite(durationHours)) return false;

  const durationMinutes = durationHoursToMinutes(durationHours);
  return (
    durationMinutes >= CUSTOMER_MIN_DURATION_MINUTES &&
    durationMinutes % CUSTOMER_DURATION_STEP_MINUTES === 0 &&
    (maxHours == null || durationMinutes <= durationHoursToMinutes(maxHours))
  );
}

function buildCustomDurationOptions(
  minHours: number,
  maxHours: number,
): number[] {
  const startMinutes = Math.max(
    CUSTOMER_MIN_DURATION_MINUTES,
    Math.ceil((minHours * 60) / CUSTOMER_DURATION_STEP_MINUTES) *
      CUSTOMER_DURATION_STEP_MINUTES,
  );
  const endMinutes =
    Math.floor((maxHours * 60) / CUSTOMER_DURATION_STEP_MINUTES) *
    CUSTOMER_DURATION_STEP_MINUTES;

  if (endMinutes < startMinutes) return [];

  return Array.from(
    {
      length:
        Math.floor(
          (endMinutes - startMinutes) / CUSTOMER_DURATION_STEP_MINUTES,
        ) + 1,
    },
    (_, index) => (startMinutes + index * CUSTOMER_DURATION_STEP_MINUTES) / 60,
  );
}

function formatDurationHours(durationHours: number): string {
  const totalMinutes = durationHoursToMinutes(durationHours);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes === 0 ? `${hours} giờ` : `${hours} giờ ${minutes} phút`;
}

function getScheduleDateTime(date: string, time = "00:00"): Date {
  return new Date(`${date}T${time}:00+07:00`);
}

function isBeforeMinimumScheduleLead(
  date: string,
  time = "00:00",
  minAdvanceMinutes = DEFAULT_MIN_SCHEDULE_LEAD_MINUTES,
): boolean {
  if (!date) return false;

  const selectedDateTime = getScheduleDateTime(date, time);
  const minimumDateTime = Date.now() + minAdvanceMinutes * 60 * 1000;

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
    !!addon.id && !!addon.name?.trim() && Number.isFinite(price) && price >= 0
  );
}

// Một số dịch vụ thêm phát sinh thời gian làm việc thật (addon.durationMinutes),
// cộng dồn vào tổng giờ công việc để so với maxHours của gói — tránh chọn addon
// khiến tổng thời lượng thực tế vượt quá số giờ tối đa gói cho phép.
function getAddonExtraHours(
  addon: Pick<PublicAddon, "durationMinutes">,
): number {
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
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

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

function getEarliestSelectableTime(
  date: string,
  minAdvanceMinutes: number,
): string {
  if (date === formatVietnamDate(new Date())) {
    const suggested = roundUpToMinuteStep(
      new Date(Date.now() + minAdvanceMinutes * 60 * 1000),
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
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function getVietnamDayOfWeek(date: string): number {
  const dateKey = toDateKey(date);
  const parsed = new Date(`${dateKey}T12:00:00+07:00`);
  if (Number.isNaN(parsed.getTime())) return -1;
  return parsed.getUTCDay();
}

function isPeakDayMatch(
  rawPeakDay: unknown,
  bookingDayOfWeek: number,
): boolean {
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
      pricingMode: service.pricingMode,
      maxHours: service.maxHours,
      baseHourlyRate: service.baseHourlyRate ?? 0,
      premiumHourlyRate: service.premiumHourlyRate ?? 0,
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
  const selectedDuration =
    form.durationMode === "preset"
      ? selectedService?.durations.find(
          (duration) => duration.durationHours === form.durationHours,
        )
      : undefined;
  const customMinHours = Math.max(1, selectedTier?.minHours ?? 1);
  const customMaxHours = Math.min(
    selectedService?.maxHours ?? 8,
    selectedTier?.maxHours ?? Number.POSITIVE_INFINITY,
  );
  const customDurationOptions = selectedService
    ? buildCustomDurationOptions(customMinHours, customMaxHours)
    : [];
  const selectedCustomDuration =
    form.durationHours !== null &&
    customDurationOptions.includes(form.durationHours)
      ? form.durationHours
      : (customDurationOptions[0] ?? 1);
  const selectedCustomHour = Math.floor(selectedCustomDuration);
  const selectedCustomMinute =
    durationHoursToMinutes(selectedCustomDuration) % 60;
  const customHourOptions = Array.from(
    new Set(customDurationOptions.map((duration) => Math.floor(duration))),
  );
  const customMinuteOptions = customDurationOptions
    .filter((duration) => Math.floor(duration) === selectedCustomHour)
    .map((duration) => durationHoursToMinutes(duration) % 60);
  const supportsCustomDuration =
    !!selectedService &&
    selectedService.pricingMode !== "FIXED" &&
    customDurationOptions.length > 0 &&
    (selectedService.baseHourlyRate > 0 ||
      (selectedTier?.pricingMode === "HOURLY" &&
        (selectedTier.pricePerHour ?? 0) > 0) ||
      (selectedTier?.pricingMode === "AREA_HOURLY" &&
        (selectedTier.pricePerM2 ?? 0) > 0));
  const customDurationStandardPrice = selectedService
    ? getCustomDurationStandardPrice(
        selectedService,
        selectedTier,
        selectedCustomDuration,
        form.areaM2,
      )
    : 0;
  const customDurationPrice = selectedService
    ? applyServiceTierPrice(
        customDurationStandardPrice,
        selectedService,
        form.serviceTier,
      )
    : null;
  const selectedStandardPrice = selectedService
    ? form.durationMode === "custom" && form.durationHours
      ? getCustomDurationStandardPrice(
          selectedService,
          selectedTier,
          form.durationHours,
          form.areaM2,
        )
      : selectedDuration
        ? getDurationStandardPrice(selectedService, selectedDuration)
        : selectedTier
          ? getPricingTierStandardPrice(
              selectedTier,
              form.durationHours ?? undefined,
            )
          : getServiceStartingStandardPrice(selectedService)
    : 0;
  const selectedPremiumPrice = selectedService
    ? applyServiceTierPrice(selectedStandardPrice, selectedService, "PREMIUM")
    : null;
  const previewPremiumFee =
    selectedPremiumPrice !== null
      ? Math.max(0, selectedPremiumPrice - selectedStandardPrice)
      : undefined;
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
    const defaultDuration =
      svc.durations.find((duration) => duration.isPopular) ?? svc.durations[0];
    const resetPremiumTier =
      form.serviceTier === "PREMIUM" && !hasPremiumPrice(svc);
    onChange({
      serviceId: svc.id,
      pricingTierId: defaultTier?.id ?? "",
      durationHours:
        defaultDuration?.durationHours ??
        defaultTier?.defaultHours ??
        defaultTier?.minHours ??
        null,
      durationMode: "preset",
      areaM2: defaultDuration?.suggestedArea ?? defaultTier?.areaMinM2 ?? null,
      addonIds: [],
      ...(resetPremiumTier
        ? { serviceTier: "STANDARD" as const, preferredTaskerId: undefined }
        : {}),
    });

    if (resetPremiumTier) {
      toast.info(
        "Gói vừa chọn chưa có giá Cao cấp nên hệ thống đã chuyển về hạng Tiêu chuẩn.",
      );
    }
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
      durationMode: "preset",
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
      durationMode: "preset",
      areaM2: duration.suggestedArea ?? form.areaM2,
      addonIds: nextAddonIds,
    });

    if (droppedCount > 0) {
      toast.warning(
        `Đã bỏ ${droppedCount} dịch vụ thêm vì vượt quá tổng số giờ tối đa của gói (${selectedService?.maxHours} giờ).`,
      );
    }
  };

  const handleSelectCustomDuration = (durationHours: number) => {
    if (!customDurationOptions.includes(durationHours)) return;

    const nextAddonIds = filterAddonsWithinMaxHours(
      selectedService,
      durationHours,
      form.addonIds,
    );
    const droppedCount = form.addonIds.length - nextAddonIds.length;

    onChange({
      durationHours,
      durationMode: "custom",
      addonIds: nextAddonIds,
    });

    if (droppedCount > 0) {
      toast.warning(
        `Đã bỏ ${droppedCount} dịch vụ thêm vì vượt quá tổng số giờ tối đa của gói (${selectedService?.maxHours} giờ).`,
      );
    }
  };

  const handleCustomHourSelect = (hourValue: string) => {
    const hour = Number(hourValue);
    const durationsForHour = customDurationOptions.filter(
      (duration) => Math.floor(duration) === hour,
    );
    const nextDuration =
      durationsForHour.find(
        (duration) =>
          durationHoursToMinutes(duration) % 60 === selectedCustomMinute,
      ) ?? durationsForHour[0];

    if (nextDuration !== undefined) {
      handleSelectCustomDuration(nextDuration);
    }
  };

  const handleCustomMinuteSelect = (minuteValue: string) => {
    handleSelectCustomDuration(selectedCustomHour + Number(minuteValue) / 60);
  };

  const toggleAddon = (addonId: string) => {
    const exists = form.addonIds.includes(addonId);
    if (!exists && selectedService?.maxHours != null) {
      const addon = selectedService.addons.find((item) => item.id === addonId);
      const nextTotal =
        getTotalWorkHours(
          selectedService.addons,
          form.durationHours,
          form.addonIds,
        ) + (addon ? getAddonExtraHours(addon) : 0);
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
      </div>
      {visibleServices.map((svc) => {
        const selected = form.serviceId === svc.id;
        const startingPrice = applyServiceTierPrice(
          getServiceStartingStandardPrice(svc),
          svc,
          form.serviceTier,
        );
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
                {startingPrice !== null ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-primary">
                      Từ {fmtCurrency(startingPrice)}
                    </p>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase text-primary">
                      {form.serviceTier === "PREMIUM"
                        ? "Giá Cao cấp"
                        : "Giá Tiêu chuẩn"}
                    </span>
                  </div>
                ) : (
                  <p className="mt-2 text-xs font-bold text-muted-foreground">
                    Chưa có giá Cao cấp
                  </p>
                )}
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
          Không tìm thấy gói dịch vụ đã chọn. Vui lòng quay lại danh sách dịch
          vụ và thử lại.
        </div>
      )}

      {selectedService && (
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <ServiceTierSelector
            value={form.serviceTier}
            onChange={(serviceTier) => onChange({ serviceTier })}
            preferredTaskerId={form.preferredTaskerId}
            onPreferredTaskerChange={(preferredTaskerId) =>
              onChange({ preferredTaskerId })
            }
            premiumFee={previewPremiumFee}
            premiumAvailable={hasPremiumPrice(selectedService)}
            showPreferredTaskerPicker={false}
          />
          <p className="mt-3 text-[11px] text-muted-foreground">
            Giá gói giờ bên dưới được cập nhật ngay theo hạng dịch vụ bạn chọn.
          </p>
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
                  const selected =
                    form.durationMode === "preset" &&
                    form.durationHours === duration.durationHours;
                  const price = applyServiceTierPrice(
                    getDurationStandardPrice(selectedService, duration),
                    selectedService,
                    form.serviceTier,
                  );

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
                            {duration.suggestedArea
                              ? ` · ${duration.suggestedArea}m²`
                              : ""}
                          </p>
                        </div>
                        {selected && (
                          <CheckCircle2 className="size-5 shrink-0 text-primary" />
                        )}
                      </div>
                      {price !== null && price > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black text-primary">
                            {fmtCurrency(price)}
                          </p>
                          <span className="text-[10px] font-bold text-muted-foreground">
                            {form.serviceTier === "PREMIUM"
                              ? "Cao cấp"
                              : "Tiêu chuẩn"}
                          </span>
                        </div>
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
                  const hours =
                    tier.defaultHours ??
                    tier.minHours ??
                    form.durationHours ??
                    1;
                  const price = applyServiceTierPrice(
                    getPricingTierStandardPrice(tier, hours),
                    selectedService,
                    form.serviceTier,
                  );

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
                          <p className="text-sm font-black text-foreground">
                            {tier.name}
                          </p>
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
                        {selected && (
                          <CheckCircle2 className="size-5 shrink-0 text-primary" />
                        )}
                      </div>
                      {price !== null && price > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black text-primary">
                            {fmtCurrency(price)}
                          </p>
                          <span className="text-[10px] font-bold text-muted-foreground">
                            {form.serviceTier === "PREMIUM"
                              ? "Cao cấp"
                              : "Tiêu chuẩn"}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                Gói này chưa có gói giờ setup sẵn, hệ thống sẽ tính theo dịch vụ
                con được chọn.
              </p>
            )}

            {supportsCustomDuration && (
              <div
                className={`rounded-xl border bg-background p-3 transition-all ${
                  form.durationMode === "custom"
                    ? "border-primary/70 shadow-sm"
                    : "border-dashed border-border/70"
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    handleSelectCustomDuration(selectedCustomDuration)
                  }
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-black leading-tight text-foreground">
                      Tùy chỉnh thời lượng
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Từ 1 giờ · mỗi 15 phút
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black leading-tight text-primary">
                      {customDurationPrice !== null && customDurationPrice > 0
                        ? fmtCurrency(customDurationPrice)
                        : selectedTier?.pricingMode === "AREA_HOURLY"
                          ? "Nhập diện tích"
                          : "Chưa có giá"}
                    </p>
                    <p className="mt-0.5 text-[10px] font-bold text-muted-foreground">
                      {formatDurationHours(selectedCustomDuration)} ·{" "}
                      {form.serviceTier === "PREMIUM"
                        ? "Cao cấp"
                        : "Tiêu chuẩn"}
                    </p>
                  </div>
                </button>

                {form.durationMode === "custom" && (
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
                    <div>
                      <label className="sr-only">Số giờ</label>
                      <Select
                        value={String(selectedCustomHour)}
                        onValueChange={handleCustomHourSelect}
                      >
                        <SelectTrigger
                          aria-label="Số giờ làm việc"
                          className="h-9 rounded-lg bg-background text-xs font-bold"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {customHourOptions.map((hour) => (
                            <SelectItem key={hour} value={String(hour)}>
                              {hour} giờ
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="sr-only">Số phút</label>
                      <Select
                        value={String(selectedCustomMinute)}
                        onValueChange={handleCustomMinuteSelect}
                      >
                        <SelectTrigger
                          aria-label="Số phút làm việc"
                          className="h-9 rounded-lg bg-background text-xs font-bold"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {customMinuteOptions.map((minute) => (
                            <SelectItem key={minute} value={String(minute)}>
                              {String(minute).padStart(2, "0")} phút
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
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
                  Gói này tính giá theo diện tích, vui lòng nhập đúng m² để báo
                  giá chính xác.
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
                            <p className="text-sm font-bold text-foreground">
                              {addon.name}
                            </p>
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
                                <Clock className="mr-1 inline size-3" />+
                                {addon.durationMinutes} phút làm việc
                              </p>
                            )}
                          </div>
                          <div
                            className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
                              selected
                                ? "border-primary bg-primary text-white"
                                : "border-border"
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
              <p className="text-xs text-muted-foreground">
                Gói này không có dịch vụ thêm.
              </p>
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
    if (
      isMapOpen ||
      form.addressId ||
      form.selectedAddress ||
      addresses.length === 0
    ) {
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
      .catch(() => onChange({ addressId: "", selectedAddress: description }));
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
        <p className="text-xs font-semibold text-foreground">Địa chỉ đã lưu</p>
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
  totalDurationHours,
  minAdvanceMinutes,
  maxAdvanceDays,
}: {
  form: WizardState;
  onChange: (s: Partial<WizardState>) => void;
  totalDurationHours: number;
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
}) {
  const days = getScheduleDays(maxAdvanceDays);
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
      isBeforeMinimumScheduleLead(date, form.scheduledTime, minAdvanceMinutes);
    const nextTime =
      !form.scheduledTime || currentTimeIsTooSoon
        ? getEarliestSelectableTime(date, minAdvanceMinutes)
        : normalizeSelectableTime(form.scheduledTime);
    const scheduleChanged =
      date !== form.scheduledDate || nextTime !== form.scheduledTime;

    onChange({
      scheduledDate: date,
      scheduledTime: nextTime,
      ...(scheduleChanged ? { preferredTaskerId: undefined } : {}),
    });

    if (scheduleChanged && form.preferredTaskerId) {
      toast.info("Lịch đã thay đổi, vui lòng chọn lại Tasker của bạn.");
    }

    if (currentTimeIsTooSoon) {
      toast.warning(
        `Khung giờ đã chọn cần cách hiện tại tối thiểu ${minAdvanceMinutes} phút.`,
      );
    }
  };

  const handleTimeSelect = (time: string) => {
    if (!form.scheduledDate) {
      toast.info("Vui lòng chọn ngày trước");
      return;
    }
    if (
      isBeforeMinimumScheduleLead(form.scheduledDate, time, minAdvanceMinutes)
    ) {
      toast.error(
        `Vui lòng chọn thời gian cách hiện tại tối thiểu ${minAdvanceMinutes} phút để Tasker chuẩn bị.`,
      );
      return;
    }

    const scheduleChanged = time !== form.scheduledTime;
    onChange({
      scheduledTime: time,
      ...(scheduleChanged ? { preferredTaskerId: undefined } : {}),
    });
    if (scheduleChanged && form.preferredTaskerId) {
      toast.info("Lịch đã thay đổi, vui lòng chọn lại Tasker của bạn.");
    }
  };

  const handleTimePartSelect = (part: "hour" | "minute", value: string) => {
    const nextTime =
      part === "hour"
        ? `${value}:${selectedTimeParts.minute}`
        : `${selectedTimeParts.hour}:${value}`;
    handleTimeSelect(nextTime);
  };

  const handleEarliestTimeSelect = () => {
    const earliest = getEarliestAvailableSchedule(
      new Date(),
      minAdvanceMinutes,
    );
    const scheduleChanged =
      earliest.scheduledDate !== form.scheduledDate ||
      earliest.scheduledTime !== form.scheduledTime;

    onChange({
      scheduledDate: earliest.scheduledDate,
      scheduledTime: earliest.scheduledTime,
      ...(scheduleChanged ? { preferredTaskerId: undefined } : {}),
    });

    if (scheduleChanged && form.preferredTaskerId) {
      toast.info("Lịch đã thay đổi, vui lòng chọn lại Tasker của bạn.");
    }
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
                onValueChange={(value) => handleTimePartSelect("hour", value)}
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

              <span className="text-lg font-black text-foreground">:</span>

              <Select
                value={selectedTimeParts.minute}
                onValueChange={(value) => handleTimePartSelect("minute", value)}
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
            <p>Giá tăng do nhu cầu công việc tăng cao vào thời điểm này.</p>
          </div>
        )}
      </div>

      {form.serviceTier === "PREMIUM" && (
        <div className="space-y-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Tasker của bạn
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Tùy chọn Tasker yêu thích sau khi hệ thống đã kiểm tra lịch tại
              khung giờ này.
            </p>
          </div>
          <FavoriteTaskerPicker
            value={form.preferredTaskerId}
            onChange={(preferredTaskerId) => onChange({ preferredTaskerId })}
            scheduledDate={form.scheduledDate}
            scheduledTime={form.scheduledTime}
            durationHours={totalDurationHours}
          />
          <p className="text-[11px] text-muted-foreground">
            Tasker được chọn sẽ nhận lời mời riêng trước; nếu họ không nhận, hệ
            thống tự tìm Tasker Cao cấp khác.
          </p>
        </div>
      )}

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
    { value: "ONLINE", label: "Thanh toán online (QR)", icon: "📱" },
  ];

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
  profilePhone,
  onChange,
}: {
  form: WizardState;
  quote: BookingQuoteResponse | null;
  isQuoting: boolean;
  walletBalance: number;
  isWalletInsufficient: boolean;
  profilePhone?: string;
  onChange: (patch: Partial<WizardState>) => void;
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
          <span className="text-muted-foreground">Hạng dịch vụ</span>
          <span
            className={
              form.serviceTier === "PREMIUM"
                ? "font-bold text-amber-600"
                : "font-semibold"
            }
          >
            {form.serviceTier === "PREMIUM" ? "Cao cấp" : "Tiêu chuẩn"}
          </span>
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
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">SĐT liên hệ</span>
          <span className="font-semibold text-right">
            {form.contactPhone || profilePhone || "Chưa có"}
            {form.contactPhone && (
              <span className="ml-1 text-[11px] text-amber-600 font-bold">
                (SĐT riêng)
              </span>
            )}
          </span>
        </div>
        {quote.address.hasPet && (
          <p className="text-xs text-amber-600">🐾 Có tính phí thú cưng</p>
        )}
      </div>

      {/* SĐT liên hệ tại chỗ - Premium Synchronized Design */}
      <div className="bg-card/80 backdrop-blur-md rounded-3xl border border-border/60 p-4 sm:p-5 space-y-3.5 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
              <Phone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-foreground tracking-tight truncate">SĐT người liên hệ</h3>
              <p className="text-[11px] text-muted-foreground truncate">Tasker sẽ gọi SĐT này khi tới làm việc</p>
            </div>
          </div>
          {form.contactPhone ? (
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-full border border-amber-200/60 flex items-center gap-1 shrink-0 whitespace-nowrap">
              <Phone className="w-3 h-3" /> SĐT khác
            </span>
          ) : (
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full border border-emerald-200/60 flex items-center gap-1 shrink-0 whitespace-nowrap">
              <ShieldCheck className="w-3 h-3" /> SĐT cá nhân
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {/* Option 1: Profile Phone */}
          <button
            type="button"
            onClick={() => onChange({ contactPhone: undefined })}
            className={`p-3.5 rounded-2xl border-2 text-left transition-all duration-200 flex items-center justify-between ${
              !form.contactPhone
                ? "border-primary bg-primary/5 shadow-xs"
                : "border-border/60 bg-background hover:bg-muted/40"
            }`}
          >
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">SĐT tài khoản cá nhân</p>
              <p className="text-xs font-semibold text-primary">{profilePhone || "Chưa thiết lập"}</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              !form.contactPhone ? "border-primary bg-primary text-white" : "border-muted-foreground/30"
            }`}>
              {!form.contactPhone && <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
          </button>

          {/* Option 2: Custom Contact Phone */}
          <button
            type="button"
            onClick={() => {
              if (!form.contactPhone) {
                onChange({ contactPhone: profilePhone || "" });
              }
            }}
            className={`p-3.5 rounded-2xl border-2 text-left transition-all duration-200 flex items-center justify-between ${
              form.contactPhone !== undefined
                ? "border-primary bg-primary/5 shadow-xs"
                : "border-border/60 bg-background hover:bg-muted/40"
            }`}
          >
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">Dùng SĐT liên hệ khác</p>
              <p className="text-xs text-muted-foreground">Sử dụng SĐT khác cho đơn này</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              form.contactPhone !== undefined ? "border-primary bg-primary text-white" : "border-muted-foreground/30"
            }`}>
              {form.contactPhone !== undefined && <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
          </button>
        </div>

        {typeof form.contactPhone === "string" && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2 pt-1"
          >
            <div className="relative">
              <Input
                type="text"
                placeholder="Nhập SĐT liên hệ tại chỗ (VD: 0912345678)"
                value={form.contactPhone}
                onChange={(e) => onChange({ contactPhone: e.target.value })}
                className="h-12 pl-10 rounded-2xl border-primary/40 bg-background text-sm font-semibold focus-visible:ring-primary shadow-xs"
              />
              <Phone className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed flex items-center gap-1 pl-1">
              <span>💡</span> Tasker sẽ gọi SĐT này khi tới làm việc tại địa chỉ.
            </p>
          </motion.div>
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
        {(quote.price.premiumFee ?? 0) > 0 && (
          <div className="flex justify-between gap-4 text-xs text-amber-600">
            <span>Phụ phí gói premium</span>
            <span className="shrink-0 font-semibold">
              {fmtCurrency(quote.price.premiumFee ?? 0)}
            </span>
          </div>
        )}
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
              : form.paymentMethod === "ONLINE"
                ? "Thanh toán online (QR)"
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
  const [payosCheckoutUrl, setPayosCheckoutUrl] = useState<string | null>(null);
  const [payosQrCode, setPayosQrCode] = useState<string | null>(null);
  const [payosBin, setPayosBin] = useState<string | null>(null);
  const [payosAccountNumber, setPayosAccountNumber] = useState<string | null>(null);
  const [payosAccountName, setPayosAccountName] = useState<string | null>(null);
  /** Nội dung CK do BE trả về — không tự ghép, xem BookingPayment.payosDescription. */
  const [payosDescription, setPayosDescription] = useState<string | null>(null);
  const [createdBookingCode, setCreatedBookingCode] = useState<string>("");
  /** Đơn nháp ONLINE đang chờ tiền — booking chưa tồn tại cho tới khi PayOS báo PAID. */
  const [draftId, setDraftId] = useState<string>("");
  const [draftExpiresAt, setDraftExpiresAt] = useState<string | null>(null);

  const { data: publicServicesData, isLoading: isServicesLoading } =
    usePublicServices();
  const { data: customerSchedulingPolicy } = useCustomerSchedulingPolicy();
  const minAdvanceMinutes =
    customerSchedulingPolicy?.minAdvanceMinutes ??
    DEFAULT_MIN_SCHEDULE_LEAD_MINUTES;
  const maxAdvanceDays = customerSchedulingPolicy?.maxAdvanceDays ?? 30;
  const [resolvedServiceId, setResolvedServiceId] = useState<string | null>(
    null,
  );

  const parentPackage = useMemo(() => {
    if (!initialServiceId || !publicServicesData?.data) return null;
    return (
      publicServicesData.data.find((pkg) => pkg.id === initialServiceId) ?? null
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
        durationMode: "preset",
        areaM2:
          defaultDuration?.suggestedArea ??
          defaultTier?.areaMinM2 ??
          prev.areaM2,
        addonIds: [],
      }));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [initialServiceId, parentPackage, resolvedServiceId]);

  const quoteQuery = useBookingQuote();
  const createMutation = useCreateBooking();
  const { data: profile } = useProfile();
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
      serviceTier: form.serviceTier,
    },
    step === 3 && form.paymentMethod === "WALLET",
  );
  const estimatedTotalPrice = walletPreviewQuote.data?.price.totalPrice ?? null;
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
  const selectedBookingDuration =
    form.durationMode === "preset"
      ? selectedBookingPackage?.durations?.find(
          (duration) => duration.durationHours === form.durationHours,
        )
      : undefined;
  const totalBookingWorkHours = getTotalWorkHours(
    selectedBookingPackage?.addons ?? [],
    form.durationHours,
    form.addonIds,
  );
  const addonSelectionInvalidAtMaxHours =
    selectedBookingPackage?.maxHours != null &&
    totalBookingWorkHours > selectedBookingPackage.maxHours;

  const update = (partial: Partial<WizardState>) =>
    setForm((prev) => {
      const availabilityInputsChanged = (
        [
          "serviceId",
          "pricingTierId",
          "durationHours",
          "durationMode",
          "areaM2",
          "addonIds",
          "scheduledDate",
          "scheduledTime",
        ] as const
      ).some(
        (key) =>
          Object.prototype.hasOwnProperty.call(partial, key) &&
          partial[key] !== prev[key],
      );

      return {
        ...prev,
        ...partial,
        ...(availabilityInputsChanged &&
        !Object.prototype.hasOwnProperty.call(partial, "preferredTaskerId")
          ? { preferredTaskerId: undefined }
          : {}),
      };
    });

  /** ONLINE: chỉ coi là xong khi đơn nháp đã đổi được thành booking thật. */
  const onlinePaid = form.paymentMethod !== "ONLINE" || Boolean(createdId);

  const canProceed = (): boolean => {
    if (step === 0)
      return (
        !!form.serviceId &&
        (isValidCustomerDurationHours(
          form.durationHours,
          selectedBookingPackage?.maxHours,
        ) ||
          (!!form.pricingTierId && form.durationHours === null)) &&
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
        !isBeforeMinimumScheduleLead(
          form.scheduledDate,
          form.scheduledTime,
          minAdvanceMinutes,
        )
      );
    if (step === 3)
      return !isWalletValidationPending && !isWalletShortAtPayment;
    if (step === 4) return !!quote && !isWalletInsufficient;
    return true;
  };

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
      isBeforeMinimumScheduleLead(
        form.scheduledDate,
        form.scheduledTime,
        minAdvanceMinutes,
      )
    ) {
      toast.error(
        `Thời gian đặt lịch phải cách hiện tại tối thiểu ${minAdvanceMinutes} phút.`,
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
          serviceTier: form.serviceTier,
        });

        // Quote chính thức là nguồn dữ liệu cuối cùng trước khi sang bước xác nhận.
        // Không dựa riêng vào preview vì giá có thể vừa thay đổi trong lúc gọi API.
        if (
          form.paymentMethod === "WALLET" &&
          walletBalance < result.price.totalPrice
        ) {
          toast.error(
            "Số dư Ví CleanZ không đủ. Vui lòng nạp thêm tiền hoặc chọn phương thức khác.",
          );
          return;
        }

        setQuote(result);
        setStep(4);
      } catch {}
      return;
    }

    // Step 4 (Xác nhận) → Submit booking → Step 5 (Thành công)
    if (step === 4) {
      const dto: CreateBookingDto = {
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
        serviceTier: form.serviceTier,
        preferredTaskerId: form.preferredTaskerId,
        contactPhone: form.contactPhone?.trim() || undefined,
      };
      try {
        const result = await createMutation.mutateAsync(dto);
        if (result.id) setCreatedId(result.id as string);
        if (result.draftId) setDraftId(result.draftId as string);
        if (result.payment?.expiresAt)
          setDraftExpiresAt(result.payment.expiresAt);
        if (result.bookingCode) setCreatedBookingCode(result.bookingCode as string);
        if (result.payment?.payosCheckoutUrl) setPayosCheckoutUrl(result.payment.payosCheckoutUrl);
        if (result.payment?.payosQrCode) setPayosQrCode(result.payment.payosQrCode);
        if (result.payment?.payosBin) setPayosBin(result.payment.payosBin);
        if (result.payment?.payosAccountNumber) setPayosAccountNumber(result.payment.payosAccountNumber);
        if (result.payment?.payosAccountName) setPayosAccountName(result.payment.payosAccountName);
        if (result.payment?.payosDescription) setPayosDescription(result.payment.payosDescription);
        setStep(5);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 409) {
          const responseMessage = error.response.data?.message;
          if (
            typeof responseMessage === "string" &&
            responseMessage.startsWith("Tasker bạn chọn")
          ) {
            setForm((prev) => ({
              ...prev,
              preferredTaskerId: undefined,
            }));
            setQuote(null);
            setStep(2);
            return;
          }

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
          setStep(3);
        }
      }
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
    (step === 4 && createMutation.isPending);

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
              <StepSchedule
                form={form}
                onChange={update}
                totalDurationHours={totalBookingWorkHours}
                minAdvanceMinutes={minAdvanceMinutes}
                maxAdvanceDays={maxAdvanceDays}
              />
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
              <StepConfirm
                form={form}
                quote={quote}
                isQuoting={quoteQuery.isPending}
                walletBalance={walletBalance}
                isWalletInsufficient={isWalletInsufficient}
                profilePhone={profile?.phone || undefined}
                onChange={update}
              />
            </motion.div>
          )}
          {step === 5 && form.paymentMethod === "ONLINE" && !onlinePaid && (
            <motion.div
              key="s5-payment"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-4 space-y-4"
            >
              {draftId && (
                <OnlinePaymentPanel
                  draftId={draftId}
                  payment={{
                    method: "ONLINE",
                    status: "PENDING",
                    payosCheckoutUrl,
                    payosQrCode,
                    payosBin,
                    payosAccountNumber,
                    payosAccountName,
                    payosDescription,
                  }}
                  totalPrice={quote?.price.totalPrice ?? 0}
                  expiresAt={draftExpiresAt}
                  onPaid={(bookingId) => setCreatedId(bookingId)}
                />
              )}
            </motion.div>
          )}
          {step === 5 && (form.paymentMethod !== "ONLINE" || onlinePaid) && (
            <motion.div
              key="s5-success"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center bg-card p-10 rounded-3xl border border-border/50 mt-8 shadow-lg"
            >
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-black text-foreground mb-2">
                {onlinePaid ? "Thanh toán thành công!" : "Đặt lịch thành công!"}
              </h2>
              <p className="text-sm text-muted-foreground mb-8">
                {onlinePaid
                  ? "Đơn hàng đã được xác nhận. Hệ thống đang tìm Tasker phù hợp trong khu vực của bạn."
                  : "Hệ thống đang tìm Tasker phù hợp trong khu vực của bạn. Bạn sẽ được thông báo khi có Tasker nhận đơn."}
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
      {step < 5 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border/40 px-4 pt-3 pb-6 z-30">
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
                  {step === 4 ? "Xác nhận & Đặt lịch" : "Tiếp tục"}
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
