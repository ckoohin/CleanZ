"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  MapPin,
  Loader2,
  Navigation,
  Calendar,
} from "lucide-react";
import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { GoongMap } from "@/components/maps/GoongMap";
import { GoongAutocomplete } from "@/components/maps/GoongAutocomplete";
import { useBookingQuote, useCreateBooking } from "@/features/booking/hooks/useCustomerBooking";
import type {
  BookingQuoteResponse,
  CreateBookingDto,
  PaymentMethod,
} from "@/features/booking/types/booking.types";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ServiceOption {
  id: string;
  name: string;
  description?: string | null;
  baseDurationHours?: number | null;
  isActive: boolean;
}

// 0=Dịch vụ, 1=Địa chỉ, 2=Lịch, 3=Thanh toán, 4=Xác nhận, 5=Thành công
type Step = 0 | 1 | 2 | 3 | 4 | 5;

interface WizardState {
  serviceId: string;
  serviceName: string;
  // Địa chỉ
  selectedAddress: string;   // địa chỉ hiển thị
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
  serviceName: "",
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

function getNext7Days() {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      date: d.toISOString().split("T")[0],
      label: i === 0 ? "Hôm nay" : i === 1 ? "Ngày mai" : d.toLocaleDateString("vi-VN", { weekday: "short" }),
      dayNum: d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
    });
  }
  return days;
}

const TIME_SLOTS = ["07:00", "08:00", "09:00", "10:00", "13:00", "14:00", "15:00", "16:00"];

const STEP_LABELS = ["Dịch vụ", "Lịch hẹn", "Thanh toán", "Xác nhận", "Thành công"];

// ─── Components ───────────────────────────────────────────────────────────────

// Step 0: Chọn dịch vụ
function StepService({
  form,
  onChange,
}: {
  form: WizardState;
  onChange: (s: Partial<WizardState>) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["services", "active"],
    queryFn: () =>
      http.get<{ data?: ServiceOption[] }>(API_ENDPOINTS.SERVICES.BASE)
        .then((r) => (r.data.data ?? r.data) as ServiceOption[]),
  });

  const services = Array.isArray(data) ? data.filter((s) => s.isActive) : [];

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
            onClick={() => onChange({ serviceId: svc.id, serviceName: svc.name })}
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
              </div>
              {selected && <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />}
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
  const handleMapSelect = (lat: number, lng: number, address: string) => {
    onChange({ selectedLat: lat, selectedLng: lng, selectedAddress: address });
  };

  const handleAutoSelect = (placeId: string, description: string) => {
    // Gọi Goong Geocode để lấy lat/lng từ place_id
    const apiKey = process.env.NEXT_PUBLIC_GOONG_API_KEY ?? "";
    fetch(`https://rsapi.goong.io/Place/Detail?place_id=${placeId}&api_key=${apiKey}`)
      .then((r) => r.json())
      .then((data) => {
        const loc = data?.result?.geometry?.location;
        if (loc) {
          onChange({
            selectedAddress: description,
            selectedLat: loc.lat,
            selectedLng: loc.lng,
          });
        } else {
          onChange({ selectedAddress: description });
        }
      })
      .catch(() => onChange({ selectedAddress: description }));
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-foreground mb-1">Vị trí làm việc</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Tìm kiếm hoặc kéo bản đồ để đặt ghim chính xác vị trí nhà bạn
        </p>
        <GoongAutocomplete
          onSelect={handleAutoSelect}
          placeholder="Tìm địa chỉ..."
          className="mb-3 z-30"
        />
      </div>

      {/* GoongMap */}
      <div className="rounded-2xl overflow-hidden border border-border/50 shadow-sm">
        <GoongMap
          initialLat={form.selectedLat ?? 21.028511}
          initialLng={form.selectedLng ?? 105.804817}
          onLocationSelect={handleMapSelect}
        />
      </div>

      {/* Địa chỉ đã chọn */}
      {form.selectedAddress && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-start gap-2">
          <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-primary mb-0.5">Vị trí đã chọn</p>
            <p className="text-sm text-foreground">{form.selectedAddress}</p>
          </div>
        </div>
      )}

      {/* Nút dùng địa chỉ mặc định */}
      <button
        onClick={() =>
          onChange({ selectedAddress: "__DEFAULT__", selectedLat: null, selectedLng: null })
        }
        className={`w-full flex items-center gap-2 px-4 py-3 border-2 rounded-xl text-sm font-medium transition-all ${
          form.selectedAddress === "__DEFAULT__"
            ? "border-primary bg-primary/5 text-primary"
            : "border-border/50 text-muted-foreground hover:border-primary/30"
        }`}
      >
        <Navigation className="w-4 h-4" />
        Dùng địa chỉ mặc định trong hồ sơ
      </button>
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

  return (
    <div className="space-y-6">
      <div className="bg-card p-5 rounded-2xl border border-border/50">
        <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" /> Chọn Ngày
        </h2>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {days.map((d) => {
            const selected = form.scheduledDate === d.date;
            return (
              <button
                key={d.date}
                onClick={() => onChange({ scheduledDate: d.date })}
                className={`flex-shrink-0 w-20 py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                  selected
                    ? "border-primary bg-primary text-white shadow-md shadow-primary/30"
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
        <div className="grid grid-cols-4 gap-2">
          {TIME_SLOTS.map((t) => {
            const selected = form.scheduledTime === t;
            return (
              <button
                key={t}
                onClick={() => onChange({ scheduledTime: t })}
                className={`py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                  selected
                    ? "border-primary bg-primary text-white"
                    : "border-border/50 text-muted-foreground hover:border-primary/40"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-card p-5 rounded-2xl border border-border/50">
        <h2 className="text-base font-bold text-foreground mb-3">Ghi chú cho Tasker</h2>
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
          <p className="font-bold text-sm text-amber-800">Địa chỉ mặc định</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Hệ thống sẽ dùng địa chỉ mặc định trong hồ sơ của bạn. Đảm bảo đã cập nhật địa chỉ trước khi đặt.
          </p>
        </div>
      </div>

      <div className="bg-card p-5 rounded-2xl border border-border/50">
        <h2 className="text-base font-bold text-foreground mb-4">Phương thức thanh toán</h2>
        <div className="space-y-2">
          {METHODS.map((m) => {
            const selected = form.paymentMethod === m.value;
            return (
              <button
                key={m.value}
                onClick={() => onChange({ paymentMethod: m.value })}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  selected ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"
                }`}
              >
                <span className="text-xl">{m.icon}</span>
                <span className={`font-semibold text-sm ${selected ? "text-primary" : "text-foreground"}`}>
                  {m.label}
                </span>
                {selected && <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-card p-5 rounded-2xl border border-border/50">
        <h2 className="text-base font-bold text-foreground mb-3">Mã voucher (tuỳ chọn)</h2>
        <input
          type="text"
          value={form.voucherCode}
          onChange={(e) => onChange({ voucherCode: e.target.value.toUpperCase() })}
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
        <p className="text-xs text-red-600 mt-1">Kiểm tra lại địa chỉ mặc định và thử lại</p>
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
          <span className="font-semibold">{form.serviceName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Thời gian</span>
          <span className="font-semibold">{form.scheduledDate} · {form.scheduledTime}</span>
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
              <span className={r.value < 0 ? "text-emerald-600 font-medium" : ""}>
                {r.value < 0 ? "-" : ""}
                {fmtCurrency(Math.abs(r.value))}
              </span>
            </div>
          ))}
        <div className="flex justify-between pt-3 border-t border-border/40">
          <span className="font-bold">Tổng thanh toán</span>
          <span className="font-black text-primary text-base">{fmtCurrency(quote.price.totalPrice)}</span>
        </div>
      </div>

      {/* Voucher */}
      {quote.voucher && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <div>
            <p className="text-xs font-bold text-emerald-700">Voucher {quote.voucher.code} đã áp dụng</p>
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
export const BookingWizard = ({ serviceId: initialServiceId }: { serviceId?: string }) => {
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
    if (step === 1) return !!form.selectedAddress; // phải chọn địa chỉ hoặc default
    if (step === 2) return !!form.scheduledDate && !!form.scheduledTime;
    if (step === 3) return true; // payment always ok
    if (step === 4) return !!quote; // cần có quote
    return true;
  };

  const handleNext = async () => {
    // Step 3 (Thanh toán) → Gọi quote API → Step 4 (Xác nhận)
    if (step === 3) {
      const result = await quoteQuery.mutateAsync({
        serviceId: form.serviceId || undefined,
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

  const STEP_BAR_LABELS = ["Dịch vụ", "Địa chỉ", "Lịch", "Thanh toán", "Xác nhận", "✓"];

  const isPending =
    (step === 3 && quoteQuery.isPending) || (step === 4 && createMutation.isPending);

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="bg-card px-4 pt-12 pb-4 sticky top-0 z-20 shadow-sm flex items-center gap-3">
        <button onClick={handleBack} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-foreground flex-1">{STEP_TITLES[step]}</h1>
        {step < 5 && (
          <span className="text-xs text-muted-foreground">{step + 1}/{STEP_BAR_LABELS.length}</span>
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
      <div className="max-w-md mx-auto px-4 pt-6">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <StepService form={form} onChange={update} />
            </motion.div>
          )}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <StepAddress form={form} onChange={update} />
            </motion.div>
          )}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <StepSchedule form={form} onChange={update} />
            </motion.div>
          )}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <StepPayment form={form} onChange={update} />
            </motion.div>
          )}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <StepConfirm form={form} quote={quote} isQuoting={quoteQuery.isPending} />
            </motion.div>
          )}
          {step === 5 && (
            <motion.div key="s5" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="text-center bg-card p-10 rounded-3xl border border-border/50 mt-8 shadow-lg">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-black text-foreground mb-2">Đặt lịch thành công!</h2>
              <p className="text-sm text-muted-foreground mb-8">
                Hệ thống đang tìm Tasker phù hợp trong khu vực của bạn. Bạn sẽ được thông báo khi có Tasker nhận đơn.
              </p>
              <div className="space-y-3">
                {createdId && (
                  <button
                    onClick={() => router.push(`/customer/booking/${createdId}`)}
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
          <div className="max-w-md mx-auto">
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

