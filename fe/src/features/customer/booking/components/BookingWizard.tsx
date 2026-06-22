"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  MapPin,
  Loader2,
  Calendar,
  MapPinned,
  Search,
} from "lucide-react";
import { GoongMap } from "@/components/maps/GoongMap";
import { GoongAutocomplete } from "@/components/maps/GoongAutocomplete";
import { GOONG_API_KEY } from "@/lib/maps/goong-config";
import {
  useBookingQuote,
  useCreateBooking,
} from "@/features/booking/hooks/useCustomerBooking";
import type {
  BookingQuoteResponse,
  CreateBookingDto,
  PaymentMethod,
} from "@/features/booking/types/booking.types";
import { usePublicServices } from "@/features/services/hooks/usePublicServices";
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

// ─── Types ────────────────────────────────────────────────────────────────────
interface ServiceOption {
  id: string;
  name: string;
  description?: string | null;
  baseDurationHours?: number | null;
  basePrice: number;
}

// 0=Dịch vụ, 1=Địa chỉ, 2=Lịch, 3=Thanh toán, 4=Xác nhận, 5=Thành công
type Step = 0 | 1 | 2 | 3 | 4 | 5;

interface WizardState {
  serviceId: string;
  // Địa chỉ
  addressId: string;
  selectedAddress: string; // địa chỉ hiển thị
  selectedLat: number | null;
  selectedLng: number | null;
  // Lịch
  scheduledDate: string;
  scheduledTime: string;
  note: string;
  // Thanh toán
  paymentMethod: PaymentMethod;
  voucherCode: string;
}

const INIT_STATE: WizardState = {
  serviceId: "",
  addressId: "",
  selectedAddress: "",
  selectedLat: null,
  selectedLng: null,
  scheduledDate: "",
  scheduledTime: "",
  note: "",
  paymentMethod: "CASH",
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
    });
  }
  return days;
}

const TIME_SLOTS = Array.from(
  { length: 14 },
  (_, index) => `${String(index + 7).padStart(2, "0")}:00`,
);

function isPastSchedule(date: string, time = "00:00"): boolean {
  if (!date) return false;

  const selectedDateTime = new Date(`${date}T${time}:00+07:00`);
  return (
    Number.isNaN(selectedDateTime.getTime()) ||
    selectedDateTime.getTime() <= Date.now()
  );
}

function isPastDate(date: string): boolean {
  return date < formatVietnamDate(new Date());
}

// ─── Components ───────────────────────────────────────────────────────────────

// Step 0: Chọn dịch vụ
function StepService({
  form,
  onChange,
}: {
  form: WizardState;
  onChange: (s: Partial<WizardState>) => void;
}) {
  const { data, isLoading } = usePublicServices();
  const services: ServiceOption[] =
    data?.data.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.shortDescription || service.description,
      baseDurationHours: service.baseDurationHours,
      basePrice: service.pricing.basePrice,
    })) ?? [];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Đang tải dịch vụ...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-foreground">Chọn dịch vụ</h2>
      {services.map((svc) => {
        const selected = form.serviceId === svc.id;
        return (
          <button
            key={svc.id}
            onClick={() =>
              onChange({ serviceId: svc.id })
            }
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
                {svc.baseDurationHours && (
                  <p className="text-xs text-primary mt-1 flex items-center gap-0.5">
                    <Clock className="w-3 h-3" /> {svc.baseDurationHours}h
                  </p>
                )}
                <p className="mt-2 text-sm font-black text-primary">
                  {fmtCurrency(svc.basePrice)}
                </p>
              </div>
              {selected && (
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              )}
            </div>
          </button>
        );
      })}
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

  const handleSavedAddressSelect = (addressId: string) => {
    const address = addresses.find((item) => item.id === addressId);
    if (!address) return;

    onChange({
      addressId: address.id,
      selectedAddress: address.fullAddress,
      selectedLat: address.latitude,
      selectedLng: address.longitude,
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
          <SelectContent>
            {addresses.map((address) => (
              <SelectItem key={address.id} value={address.id}>
                {address.label || "Địa chỉ"}
                {address.isDefault ? " · Mặc định" : ""} —{" "}
                {address.fullAddress}
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
            onChange({
              addressId: "",
              selectedAddress: "",
              selectedLat: null,
              selectedLng: null,
            });
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

  const handleDateSelect = (date: string) => {
    if (isPastDate(date)) {
      toast.error("Không thể chọn ngày trong quá khứ");
      return;
    }

    const currentTimeIsPast =
      form.scheduledTime && isPastSchedule(date, form.scheduledTime);
    onChange({
      scheduledDate: date,
      scheduledTime: currentTimeIsPast ? "" : form.scheduledTime,
    });

    if (currentTimeIsPast) {
      toast.warning("Khung giờ đã chọn đã qua, vui lòng chọn giờ khác");
    }
  };

  const handleTimeSelect = (time: string) => {
    if (!form.scheduledDate) {
      toast.info("Vui lòng chọn ngày trước");
      return;
    }
    if (isPastSchedule(form.scheduledDate, time)) {
      toast.error("Không thể chọn thời gian trong quá khứ");
      return;
    }

    onChange({ scheduledTime: time });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="bg-card p-5 rounded-2xl border border-border/50">
        <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" /> Chọn Ngày
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
          {days.map((d) => {
            const selected = form.scheduledDate === d.date;
            const past = isPastDate(d.date);
            return (
              <button
                key={d.date}
                onClick={() => handleDateSelect(d.date)}
                aria-disabled={past}
                className={`min-w-0 py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                  selected
                    ? "border-primary bg-primary text-white shadow-md shadow-primary/30"
                    : past
                      ? "cursor-not-allowed border-border/30 bg-muted/40 text-muted-foreground/50"
                    : "border-border/50 text-muted-foreground hover:border-primary/40"
                }`}
              >
                <span className="text-[10px] font-bold">{d.label}</span>
                <span className="text-xs font-semibold">{d.dayNum}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-card p-5 rounded-2xl border border-border/50">
        <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Giờ bắt đầu
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
          {TIME_SLOTS.map((t) => {
            const selected = form.scheduledTime === t;
            const past =
              !!form.scheduledDate &&
              isPastSchedule(form.scheduledDate, t);
            return (
              <button
                key={t}
                onClick={() => handleTimeSelect(t)}
                aria-disabled={past}
                className={`py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                  selected
                    ? "border-primary bg-primary text-white"
                    : past
                      ? "cursor-not-allowed border-border/30 bg-muted/40 text-muted-foreground/50 line-through"
                    : "border-border/50 text-muted-foreground hover:border-primary/40"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-card p-5 rounded-2xl border border-border/50 lg:col-span-2">
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
}: {
  form: WizardState;
  onChange: (s: Partial<WizardState>) => void;
}) {
  const METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
    { value: "CASH", label: "Tiền mặt", icon: "💵" },
    { value: "WALLET", label: "Ví CleanZ", icon: "💳" },
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
                <span
                  className={`font-semibold text-sm ${selected ? "text-primary" : "text-foreground"}`}
                >
                  {m.label}
                </span>
                {selected && (
                  <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-card p-5 rounded-2xl border border-border/50">
        <h2 className="text-base font-bold text-foreground mb-3">
          Mã voucher (tuỳ chọn)
        </h2>
        <input
          type="text"
          value={form.voucherCode}
          onChange={(e) =>
            onChange({ voucherCode: e.target.value.toUpperCase() })
          }
          placeholder="Nhập mã voucher..."
          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-mono text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
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
}: {
  form: WizardState;
  quote: BookingQuoteResponse | null;
  isQuoting: boolean;
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
      </div>

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
  const [step, setStep] = useState<Step>(initialServiceId ? 1 : 0);
  const [form, setForm] = useState<WizardState>({
    ...INIT_STATE,
    serviceId: initialServiceId ?? "",
  });
  const [quote, setQuote] = useState<BookingQuoteResponse | null>(null);
  const [createdId, setCreatedId] = useState<string>("");

  const quoteQuery = useBookingQuote();
  const createMutation = useCreateBooking();

  const update = (partial: Partial<WizardState>) =>
    setForm((prev) => ({ ...prev, ...partial }));

  const canProceed = (): boolean => {
    if (step === 0) return !!form.serviceId;
    if (step === 1) return !!form.addressId;
    if (step === 2)
      return (
        !!form.scheduledDate &&
        !!form.scheduledTime &&
        !isPastSchedule(form.scheduledDate, form.scheduledTime)
      );
    if (step === 3) return true; // payment always ok
    if (step === 4) return !!quote; // cần có quote
    return true;
  };

  const handleNext = async () => {
    if (
      step === 2 &&
      form.scheduledDate &&
      form.scheduledTime &&
      isPastSchedule(form.scheduledDate, form.scheduledTime)
    ) {
      toast.error("Thời gian đặt lịch phải ở tương lai");
      return;
    }

    // Step 3 (Thanh toán) → Gọi quote API → Step 4 (Xác nhận)
    if (step === 3) {
      const result = await quoteQuery.mutateAsync({
        serviceId: form.serviceId || undefined,
        addressId: form.addressId || undefined,
        scheduledDate: form.scheduledDate,
        scheduledTime: form.scheduledTime,
        note: form.note || undefined,
        voucherCode: form.voucherCode || undefined,
      });
      setQuote(result);
      setStep(4);
      return;
    }

    // Step 4 (Xác nhận) → Submit booking → Step 5 (Thành công)
    if (step === 4) {
      const dto: CreateBookingDto = {
        serviceId: form.serviceId || undefined,
        addressId: form.addressId || undefined,
        scheduledDate: form.scheduledDate,
        scheduledTime: form.scheduledTime,
        note: form.note || undefined,
        paymentMethod: form.paymentMethod,
        voucherCode: form.voucherCode || undefined,
      };
      const result = await createMutation.mutateAsync(dto);
      if (result.id) setCreatedId(result.id as string);
      setStep(5);
      return;
    }

    setStep((s) => Math.min(s + 1, 5) as Step);
  };

  const handleBack = () => {
    if (step === 0) router.back();
    else setStep((s) => Math.max(s - 1, 0) as Step);
  };

  const STEP_TITLES = [
    "Chọn Dịch vụ",
    "Vị trí làm việc",
    "Lịch & Ghi chú",
    "Thanh toán",
    "Xác nhận đơn",
    "Thành công!",
  ];

  const STEP_BAR_LABELS = [
    "Dịch vụ",
    "Địa chỉ",
    "Lịch",
    "Thanh toán",
    "Xác nhận",
    "✓",
  ];

  const isPending =
    (step === 3 && quoteQuery.isPending) ||
    (step === 4 && createMutation.isPending);

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
              <StepService form={form} onChange={update} />
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
              <StepPayment form={form} onChange={update} />
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
              />
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
      {step < 5 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border/40 p-4 pb-8 z-30">
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
                  {step === 4 ? "Xác nhận & Đặt lịch 🎯" : "Tiếp tục"}
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
