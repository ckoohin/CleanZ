"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { BankSelect } from "@/components/ui/bank-select";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  User,
  ShieldCheck,
  FileText,
  ClipboardCheck,
  CheckCircle2,
  Upload,
  X,
  Camera,
  ChevronLeft,
  ChevronRight,
  Phone,
  MapPin,
  CreditCard,
  Building2,
  Image as ImageIcon,
  PartyPopper,
  Loader2,
  AlertTriangle,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { useAuth, useLogout } from "@/features/auth/hooks/auth.hooks";
import { authApi } from "@/features/auth/services/auth.service";
import { queryKeys } from "@/features/auth/queries/auth.query";
import { TaskerStatus } from "../types/tasker.type";
import {
  useTaskerProfile,
  useSubmitTaskerProfile,
} from "../hooks/tasker.hooks";
import {
  buildReviewParts,
  getReviewPartMap,
  getReviewGeneralNote,
  type ReviewPart,
} from "@/lib/kyc/review-notes";

/* ------------------------------------------------------------------ */
/*  Design tokens — Operations / Slate                                 */
/* ------------------------------------------------------------------ */
/* Map vào hệ màu (CSS variables) của web để ăn theo theme sáng/tối + primary cam */
const C = {
  bg: "color-mix(in oklab, var(--foreground) 4%, var(--background))",
  panel: "var(--card)",
  panelAlt: "color-mix(in oklab, var(--foreground) 5%, var(--card))",
  border: "var(--border)",
  borderSoft: "color-mix(in oklab, var(--border) 70%, transparent)",
  text: "var(--foreground)",
  textMute: "color-mix(in oklab, var(--foreground) 62%, transparent)",
  textFaint: "color-mix(in oklab, var(--foreground) 42%, transparent)",
  accent: "var(--primary)",
  onAccent: "var(--primary-foreground)",
  accentDim: "color-mix(in oklab, var(--primary) 28%, transparent)",
  accentSoft: "color-mix(in oklab, var(--primary) 12%, transparent)",
  warn: "#B45309",
  warnSoft: "rgba(245, 158, 11, 0.12)",
  danger: "#DC2626",
  inputBg: "color-mix(in oklab, var(--foreground) 3%, var(--background))",
};

/**
 * Cột grid tự co: hiển thị nhiều cột khi đủ rộng và tự xuống 1 cột trên màn hình
 * hẹp (điện thoại). `min(100%, ...)` chặn tràn ngang khi viewport rất nhỏ.
 */
const autoCols = (min: number) =>
  `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))`;

const STEPS = [
  { key: "personal", label: "Cá nhân", icon: User },
  { key: "verify", label: "Xác minh", icon: ShieldCheck },
  { key: "legal", label: "Pháp lý", icon: FileText },
  { key: "review", label: "Xác nhận", icon: ClipboardCheck },
  { key: "done", label: "Hoàn tất", icon: CheckCircle2 },
] as const;

/* Deep-link từ email (?focus=<phần>): id phần admin yêu cầu → bước chứa nó +
   phần tử để cuộn tới / focus. Khớp với MISSING_ITEM_OPTIONS ở review-notes. */
const FOCUS_TARGETS: Record<string, { step: number; elementId: string }> = {
  phone: { step: 0, elementId: "kyc-field-phone" },
  address: { step: 0, elementId: "kyc-field-address" },
  skills: { step: 0, elementId: "kyc-field-skills" },
  bio: { step: 0, elementId: "kyc-field-bio" },
  citizenCard: { step: 1, elementId: "kyc-field-citizenCard" },
  idWithSelfie: { step: 1, elementId: "kyc-field-idWithSelfie" },
  bankInfo: { step: 2, elementId: "kyc-field-bankInfo" },
  criminalRecord: { step: 2, elementId: "kyc-field-criminalRecord" },
  healthCertificate: { step: 2, elementId: "kyc-field-healthCertificate" },
  certificate: { step: 2, elementId: "kyc-field-certificate" },
};

/* Mỗi ô ảnh có thể là: File (ảnh mới chọn), string (URL ảnh đã nộp trước đó), hoặc null */
type Slot = File | string | null;
const hasSlot = (s: Slot) =>
  s instanceof File || (typeof s === "string" && s.length > 0);

type IconType = React.ComponentType<{
  size?: number;
  style?: React.CSSProperties;
}>;

/* ------------------------------------------------------------------ */
/*  Primitives                                                         */
/* ------------------------------------------------------------------ */
function FlagNote({ flag }: { flag: ReviewPart }) {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 5,
        fontSize: 11.5,
        color: C.warn,
        fontWeight: 600,
        marginTop: 6,
        lineHeight: 1.45,
      }}
    >
      <AlertTriangle size={12} style={{ marginTop: 1, flexShrink: 0 }} />
      <span>
        Cần cập nhật lại
        {flag.note ? ` — ${flag.note}` : ""}
      </span>
    </span>
  );
}

function Field({
  label,
  required,
  children,
  hint,
  error,
  flag,
  id,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
  error?: string;
  flag?: ReviewPart;
  id?: string;
}) {
  return (
    <label id={id} style={{ display: "block", marginBottom: 18 }}>
      <span
        style={{
          display: "block",
          fontSize: 12.5,
          fontWeight: 600,
          color: C.textMute,
          marginBottom: 7,
          letterSpacing: 0.2,
        }}
      >
        {label}
        {required && <span style={{ color: C.accent, marginLeft: 4 }}>*</span>}
      </span>
      {children}
      {flag && <FlagNote flag={flag} />}
      {error ? (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11.5,
            color: C.danger,
            marginTop: 6,
          }}
        >
          <AlertTriangle size={12} /> {error}
        </span>
      ) : hint ? (
        <span
          style={{
            display: "block",
            fontSize: 11.5,
            color: C.textFaint,
            marginTop: 6,
          }}
        >
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function TextInput({
  icon: Icon,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: IconType;
  error?: boolean;
}) {
  const [focus, setFocus] = useState(false);
  const borderColor = focus ? C.accent : error ? C.danger : C.border;
  return (
    <div style={{ position: "relative" }}>
      {Icon && (
        <Icon
          size={16}
          style={{
            position: "absolute",
            left: 13,
            top: "50%",
            transform: "translateY(-50%)",
            color: focus ? C.accent : error ? C.danger : C.textFaint,
            transition: "color .15s",
          }}
        />
      )}
      <input
        {...props}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: C.inputBg,
          border: `1px solid ${borderColor}`,
          borderRadius: 9,
          padding: Icon ? "11px 13px 11px 38px" : "11px 13px",
          color: C.text,
          fontSize: 14,
          outline: "none",
          transition: "border-color .15s",
        }}
      />
    </div>
  );
}

function UploadBox({
  label,
  value,
  onChange,
  aspect = "4/2.5",
  hint,
  error,
  flag,
  anchorId,
}: {
  label: string;
  value: Slot;
  onChange: (v: Slot) => void;
  aspect?: string;
  hint?: string;
  error?: string;
  flag?: ReviewPart;
  anchorId?: string;
}) {
  const id = "up-" + label.replace(/\s/g, "");
  const isExisting = typeof value === "string";
  const preview = useMemo(
    () =>
      value instanceof File
        ? URL.createObjectURL(value)
        : isExisting
          ? (value as string)
          : null,
    [value, isExisting],
  );
  useEffect(() => {
    return () => {
      if (value instanceof File && preview) URL.revokeObjectURL(preview);
    };
  }, [value, preview]);

  return (
    <div id={anchorId} style={{ marginBottom: 4 }}>
      <span
        style={{
          display: "block",
          fontSize: 12.5,
          fontWeight: 600,
          color: C.textMute,
          marginBottom: 7,
        }}
      >
        {label}
      </span>
      <input
        id={id}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange(f);
          e.target.value = "";
        }}
      />
      <label
        htmlFor={id}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          aspectRatio: aspect,
          background: preview ? "transparent" : C.inputBg,
          border: `1.5px dashed ${preview ? C.accent : error ? C.danger : C.border}`,
          borderRadius: 11,
          cursor: "pointer",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt={label}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {isExisting && (
              <span
                style={{
                  position: "absolute",
                  left: 8,
                  bottom: 8,
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: C.accent,
                  background: "rgba(15,20,25,0.85)",
                  border: `1px solid ${C.accentDim}`,
                  borderRadius: 6,
                  padding: "3px 7px",
                }}
              >
                Đã nộp trước đó
              </span>
            )}
            <button
              type="button"
              aria-label={`Xóa ${label}`}
              title={`Xóa ${label}`}
              onClick={(e) => {
                e.preventDefault();
                onChange(null);
              }}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 26,
                height: 26,
                borderRadius: 7,
                background: "rgba(15,20,25,0.85)",
                border: `1px solid ${C.border}`,
                color: "#FFFFFF",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
              }}
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: C.accentSoft,
                display: "grid",
                placeItems: "center",
                marginBottom: 9,
              }}
            >
              <Upload size={17} style={{ color: C.accent }} />
            </div>
            <span
              style={{ fontSize: 12.5, color: C.textMute, fontWeight: 500 }}
            >
              Tải ảnh lên
            </span>
            {hint && (
              <span style={{ fontSize: 11, color: C.textFaint, marginTop: 3 }}>
                {hint}
              </span>
            )}
          </>
        )}
      </label>
      {flag && <FlagNote flag={flag} />}
      {error && (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11.5,
            color: C.danger,
            marginTop: 6,
          }}
        >
          <AlertTriangle size={12} /> {error}
        </span>
      )}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  children,
  sub,
}: {
  icon: IconType;
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <Icon size={17} style={{ color: C.accent }} />
        <h3
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 700,
            color: C.text,
            letterSpacing: -0.1,
          }}
        >
          {children}
        </h3>
      </div>
      {sub && (
        <p
          style={{ margin: "6px 0 0 26px", fontSize: 12.5, color: C.textFaint }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function Stepper({
  current,
  onJump,
}: {
  current: number;
  onJump: (i: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const done = i < current;
        const active = i === current;
        const canBack = i < current; // chỉ cho bấm lùi về bước đã hoàn thành
        return (
          <React.Fragment key={s.key}>
            <div
              onClick={() => canBack && onJump(i)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                flexShrink: 0,
                cursor: canBack ? "pointer" : "default",
              }}
            >
              <div
                style={{
                  width: "clamp(34px, 9vw, 42px)",
                  height: "clamp(34px, 9vw, 42px)",
                  borderRadius: 12,
                  display: "grid",
                  placeItems: "center",
                  background: active
                    ? C.accent
                    : done
                      ? C.accentDim
                      : C.panelAlt,
                  border: `1px solid ${active || done ? C.accent : C.border}`,
                  color: active ? C.onAccent : done ? C.accent : C.textFaint,
                  transition: "all .2s",
                }}
              >
                {done ? <CheckCircle2 size={19} /> : <Icon size={18} />}
              </div>
              <span
                style={{
                  fontSize: "clamp(10px, 2.6vw, 12px)",
                  fontWeight: active ? 700 : 500,
                  color: active ? C.text : done ? C.textMute : C.textFaint,
                  textAlign: "center",
                  lineHeight: 1.2,
                }}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  margin: "0 clamp(3px, 1.5vw, 6px) 26px",
                  borderRadius: 2,
                  background: i < current ? C.accent : C.border,
                  transition: "background .25s",
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ReviewGroup({
  title,
  rows = [],
  images = [],
  onEdit,
}: {
  title: string;
  rows?: [string, string][];
  images?: [string, Slot][];
  onEdit: () => void;
}) {
  return (
    <div
      style={{
        background: C.panelAlt,
        border: `1px solid ${C.borderSoft}`,
        borderRadius: 12,
        padding: 18,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>
          {title}
        </span>
        <button
          type="button"
          onClick={onEdit}
          style={{
            background: "transparent",
            border: "none",
            color: C.accent,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Chỉnh sửa
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {rows.map(([k, v]) => (
          <div
            key={k}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              fontSize: 13,
            }}
          >
            <span style={{ color: C.textFaint, flexShrink: 0 }}>{k}</span>
            <span
              style={{
                color: v ? C.text : C.danger,
                fontWeight: 500,
                textAlign: "right",
              }}
            >
              {v || "Chưa nhập"}
            </span>
          </div>
        ))}
      </div>

      {images.length > 0 && (
        <div
          style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}
        >
          {images.map(([label, src]) => {
            const url =
              src instanceof File
                ? URL.createObjectURL(src)
                : typeof src === "string"
                  ? src
                  : null;
            return (
              <div key={label} style={{ width: 78 }}>
                <div
                  style={{
                    width: 78,
                    height: 56,
                    borderRadius: 8,
                    overflow: "hidden",
                    background: C.inputBg,
                    border: `1px solid ${C.border}`,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {url ? (
                    <img
                      src={url}
                      alt={label}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <ImageIcon size={18} style={{ color: C.textFaint }} />
                  )}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: C.textFaint,
                    display: "block",
                    textAlign: "center",
                    marginTop: 5,
                  }}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main wizard — gắn vào logic thật (status / nộp lại / submit BE)     */
/* ------------------------------------------------------------------ */
export const TaskerRegistrationWizard: React.FC = () => {
  const router = useRouter();
  const { data: user, isLoading: isAuthLoading } = useAuth();
  const {
    data: profile,
    isLoading: isProfileLoading,
    isFetching: isProfileFetching,
    refetch: refetchProfile,
  } = useTaskerProfile({ enabled: Boolean(user) });
  const submitMutation = useSubmitTaskerProfile();
  const logoutMutation = useLogout();
  const queryClient = useQueryClient();
  // Tránh chạy lại luồng refresh-token + điều hướng khi đã được duyệt nhiều lần.
  const approvedHandledRef = useRef(false);

  const [step, setStep] = useState(0);
  const [seeded, setSeeded] = useState(false);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const [focusHandled, setFocusHandled] = useState(false);
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearErr = (k: string) =>
    setErrors((e) => {
      if (!(k in e)) return e;
      const n = { ...e };
      delete n[k];
      return n;
    });

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    currentAddress: "",
    cccdNumber: "",
    bankBin: "",
    bankName: "",
    bankAccount: "",
    bankHolder: "",
  });
  const set = (k: keyof typeof form, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    clearErr(k);
  };
  // Đổi ảnh thì xóa luôn lỗi của ô đó
  const onSlot = (key: string, setter: (v: Slot) => void) => (v: Slot) => {
    setter(v);
    clearErr(key);
  };

  const [cccdFront, setCccdFront] = useState<Slot>(null);
  const [cccdBack, setCccdBack] = useState<Slot>(null);
  const [selfie, setSelfie] = useState<Slot>(null);
  const [docHealth, setDocHealth] = useState<Slot>(null);
  const [docJudicial, setDocJudicial] = useState<Slot>(null);
  const [docCert, setDocCert] = useState<Slot>(null);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/register-tasker");
    }
  }, [isAuthLoading, user, router]);

  const needsResubmit =
    profile?.approvalStatus === TaskerStatus.NEED_INFO ||
    profile?.approvalStatus === TaskerStatus.REJECTED;
  // Các phần admin yêu cầu nộp lại (+ lý do riêng) để gắn cờ ngay tại từng ô.
  const reviewParts = buildReviewParts(profile?.adminNotes);
  const reviewMap = getReviewPartMap(profile?.adminNotes);
  // Lý do chung; fallback về note thô (cũ) khi chưa có dữ liệu cấu trúc.
  const reviewGeneralNote =
    getReviewGeneralNote(profile?.adminNotes) ||
    (reviewParts.length === 0
      ? profile?.adminNotes || profile?.document?.note || ""
      : "");

  /* Điều hướng theo trạng thái hồ sơ */
  useEffect(() => {
    if (isProfileLoading) return;
    if (profile?.approvalStatus === TaskerStatus.APPROVED) {
      // Admin duyệt → role trong DB đã thành TASKER, NHƯNG access token hiện tại
      // vẫn là CUSTOMER nên RoleGuard ở /tasker sẽ chặn (kẹt loading / đá về login).
      // Gọi /auth/refresh để lấy token mới (refresh strategy đọc role mới từ DB),
      // làm mới cache /auth/me rồi mới vào khu vực tasker.
      if (approvedHandledRef.current) return;
      approvedHandledRef.current = true;
      void (async () => {
        try {
          await authApi.refresh();
        } catch {
          // Refresh thất bại (phiên hết hạn) → vào /tasker, RoleGuard sẽ đưa về
          // trang đăng nhập đối tác để nhận token TASKER mới.
        }
        await queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
        router.replace("/tasker");
      })();
    } else if (profile?.approvalStatus === TaskerStatus.PENDING) {
      queueMicrotask(() => setStep(4));
    }
  }, [profile, isProfileLoading, router, queryClient]);

  /* Nạp dữ liệu cũ (khi nộp lại) — chạy 1 lần khi hồ sơ & user đã tải xong.
     Đổ lại toàn bộ dữ liệu cũ, sau đó CHỈ để trống đúng phần admin yêu cầu nộp lại. */
  useEffect(() => {
    if (isProfileLoading || seeded || !user) return;

    // Các phần admin gắn cờ cần nộp lại → để trống để tasker nhập / đính kèm lại.
    const flagged = getReviewPartMap(profile?.adminNotes);
    const doc = profile?.document;

    queueMicrotask(() => {
      setForm((prev) => ({
        ...prev,
        // /auth/me (user) là payload từ JWT — KHÔNG có fullName → ưu tiên lấy từ hồ sơ.
        fullName: prev.fullName || profile?.fullName || user?.fullName || "",
        phone: flagged.phone ? "" : prev.phone || profile?.phone || "",
        currentAddress: flagged.address
          ? ""
          : prev.currentAddress || profile?.addressCurrent || "",
        cccdNumber: prev.cccdNumber || profile?.document?.idNumber || "",
        bankBin: flagged.bankInfo
          ? ""
          : prev.bankBin || profile?.bankBin || "",
        bankName: flagged.bankInfo
          ? ""
          : prev.bankName || profile?.bankName || "",
        bankAccount: flagged.bankInfo
          ? ""
          : prev.bankAccount || profile?.bankAccountNumber || "",
        bankHolder: flagged.bankInfo
          ? ""
          : prev.bankHolder || profile?.bankAccountName || "",
      }));

      // Ảnh/giấy tờ: giữ ảnh cũ; phần bị gắn cờ thì để trống để buộc nộp lại.
      if (!flagged.citizenCard) {
        if (doc?.frontUrl) setCccdFront(doc.frontUrl);
        if (doc?.backUrl) setCccdBack(doc.backUrl);
      }
      if (!flagged.idWithSelfie && profile?.avatarUrl)
        setSelfie(profile.avatarUrl);
      if (!flagged.healthCertificate && doc?.healthCertificateUrl)
        setDocHealth(doc.healthCertificateUrl);
      if (!flagged.criminalRecord && doc?.criminalRecordUrl)
        setDocJudicial(doc.criminalRecordUrl);
      if (!flagged.certificate && doc?.certificateUrl)
        setDocCert(doc.certificateUrl);

      setSeeded(true);
    });
  }, [profile, user, isProfileLoading, seeded]);

  /* Deep-link từ email (?focus=<phần>): sau khi seed xong, nhảy tới đúng bước
     chứa phần admin yêu cầu rồi cuộn / focus vào ô đó. Chỉ chạy 1 lần. */
  useEffect(() => {
    if (!seeded || focusHandled || !needsResubmit) return;
    const focusParam = new URLSearchParams(window.location.search).get("focus");
    if (!focusParam) {
      queueMicrotask(() => setFocusHandled(true));
      return;
    }
    const target = FOCUS_TARGETS[focusParam];
    if (!target) {
      queueMicrotask(() => setFocusHandled(true));
      return;
    }
    queueMicrotask(() => {
      setFocusHandled(true);
      setStep(target.step);
      setPendingFocusId(target.elementId);
    });
  }, [seeded, focusHandled, needsResubmit]);

  /* Thực thi cuộn + focus sau khi bước đích đã render. */
  useEffect(() => {
    if (!pendingFocusId) return;
    const raf = window.requestAnimationFrame(() => {
      const el = document.getElementById(pendingFocusId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const input = el.querySelector<HTMLElement>(
          'input:not([type="file"]):not([type="hidden"]), textarea',
        );
        input?.focus({ preventScroll: true });
      }
      setPendingFocusId(null);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [pendingFocusId, step]);

  /* Validation từng bước — trả về map field → thông báo lỗi */
  const validateStepErrors = (s: number): Record<string, string> => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!form.fullName.trim()) e.fullName = "Vui lòng nhập họ và tên";
      if (!/^0\d{9,10}$/.test(form.phone.trim()))
        e.phone = "Số điện thoại không hợp lệ (bắt đầu bằng 0, 10–11 số)";
      if (!form.currentAddress.trim())
        e.currentAddress = "Vui lòng nhập chỗ ở hiện tại";
    }
    if (s === 1) {
      if (!/^\d{12}$/.test(form.cccdNumber.trim()))
        e.cccdNumber = "Số CCCD phải gồm đúng 12 chữ số";
      if (!hasSlot(cccdFront)) e.cccdFront = "Thiếu ảnh CCCD mặt trước";
      if (!hasSlot(cccdBack)) e.cccdBack = "Thiếu ảnh CCCD mặt sau";
      if (!hasSlot(selfie)) e.selfie = "Thiếu ảnh selfie";
    }
    if (s === 2) {
      if (!form.bankBin.trim()) e.bankName = "Vui lòng chọn ngân hàng";
      if (!form.bankAccount.trim())
        e.bankAccount = "Vui lòng nhập số tài khoản";
      if (!form.bankHolder.trim())
        e.bankHolder = "Vui lòng nhập tên chủ tài khoản";
      if (!hasSlot(docJudicial))
        e.docJudicial = "Thiếu Lý lịch tư pháp / xác nhận hạnh kiểm";
    }
    return e;
  };

  const handleSubmit = async () => {
    for (let s = 0; s <= 2; s++) {
      const e = validateStepErrors(s);
      if (Object.keys(e).length) {
        setErrors(e);
        setStep(s);
        toast.error("Vui lòng kiểm tra lại các thông tin được tô đỏ.");
        return;
      }
    }
    if (!agree) {
      toast.error("Vui lòng xác nhận cam kết thông tin chính xác");
      return;
    }

    try {
      const fd = new FormData();
      fd.append("phone", form.phone.trim());

      if (form.currentAddress)
        fd.append("workingAddress", form.currentAddress.trim());

      fd.append("docType", "CITIZEN_ID");
      fd.append("docIdNumber", form.cccdNumber.trim());

      if (form.bankBin) fd.append("bankBin", form.bankBin.trim());
      if (form.bankName) fd.append("bankName", form.bankName.trim());
      if (form.bankAccount)
        fd.append("bankAccountNumber", form.bankAccount.trim());
      if (form.bankHolder) fd.append("bankAccountName", form.bankHolder.trim());

      // Ảnh: chỉ gửi file mới. Ô là URL cũ (string) → bỏ qua, BE giữ ảnh đã có.
      if (selfie instanceof File) fd.append("avatar", selfie);
      if (cccdFront instanceof File) fd.append("docFront", cccdFront);
      if (cccdBack instanceof File) fd.append("docBack", cccdBack);
      if (docJudicial instanceof File) fd.append("criminalRecord", docJudicial);
      if (docHealth instanceof File) fd.append("healthCertificate", docHealth);
      if (docCert instanceof File) fd.append("certificate", docCert);

      await submitMutation.mutateAsync(fd);
      setStep(4);
    } catch {
      toast.error(
        "Gửi hồ sơ thất bại. Vui lòng kiểm tra thông tin và thử lại!",
      );
    }
  };

  const next = () => {
    if (step < 3) {
      const e = validateStepErrors(step);
      if (Object.keys(e).length) {
        setErrors(e);
        toast.error("Vui lòng kiểm tra lại các thông tin được tô đỏ.");
        return;
      }
      setErrors({});
      setStep(step + 1);
    } else if (step === 3) {
      void handleSubmit();
    }
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  /* ── Trạng thái loading / redirect ── */
  if (!isProfileLoading && profile?.approvalStatus === TaskerStatus.APPROVED) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Loader2
          size={32}
          style={{ color: C.accent }}
          className="animate-spin"
        />
      </div>
    );
  }
  if (isAuthLoading || !user || isProfileLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Loader2
          size={32}
          style={{ color: C.accent }}
          className="animate-spin"
        />
      </div>
    );
  }

  const submitting = submitMutation.isPending;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        padding: "28px clamp(12px, 4vw, 20px) 56px",
      }}
    >
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            marginBottom: 28,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 6,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background: C.accent,
                display: "grid",
                placeItems: "center",
                color: C.onAccent,
                fontWeight: 800,
                fontSize: 15,
              }}
            >
              C
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: C.textMute,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              CleanZ Tasker
            </span>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(22px, 5.5vw, 26px)",
              fontWeight: 800,
              letterSpacing: -0.5,
            }}
          >
            {needsResubmit ? "Bổ sung & gửi lại hồ sơ" : "Xác minh hồ sơ (KYC)"}
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: C.textFaint }}>
            {needsResubmit
              ? "Cập nhật đúng phần được yêu cầu rồi gửi lại — các thông tin khác đã được điền sẵn từ hồ sơ trước."
              : "Hoàn tất 4 bước để bắt đầu nhận việc. Hồ sơ sẽ được duyệt trong 24–48 giờ."}
          </p>
          </div>
          <button
            type="button"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              flexShrink: 0,
              marginTop: 2,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              background: C.panel,
              color: C.textMute,
              padding: "9px 12px",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: logoutMutation.isPending ? "wait" : "pointer",
              opacity: logoutMutation.isPending ? 0.6 : 1,
            }}
            aria-label="Đăng xuất tài khoản hiện tại"
          >
            {logoutMutation.isPending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <LogOut size={15} />
            )}
            <span>Đăng xuất</span>
          </button>
        </div>

        {/* Banner yêu cầu của admin */}
        {needsResubmit && step < 4 && (
          <div
            style={{
              background: C.warnSoft,
              border: `1px solid ${C.warn}55`,
              borderRadius: 14,
              padding: 18,
              marginBottom: 22,
              display: "flex",
              gap: 13,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 11,
                background: C.warnSoft,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} style={{ color: C.warn }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.warn,
                  marginBottom: 4,
                }}
              >
                {profile?.approvalStatus === TaskerStatus.REJECTED
                  ? "Hồ sơ chưa được duyệt"
                  : "Quản trị viên yêu cầu bổ sung hồ sơ"}
              </div>
              <div
                style={{
                  background: C.inputBg,
                  border: `1px solid ${C.borderSoft}`,
                  borderRadius: 9,
                  padding: "10px 12px",
                  fontSize: 13,
                  color: C.text,
                  lineHeight: 1.55,
                }}
              >
                {reviewParts.length > 0 ? (
                  <ul
                    style={{
                      margin: 0,
                      padding: 0,
                      listStyle: "none",
                      display: "grid",
                      gap: 7,
                    }}
                  >
                    {reviewParts.map((p) => (
                      <li
                        key={p.id}
                        style={{
                          display: "flex",
                          gap: 7,
                          alignItems: "flex-start",
                        }}
                      >
                        <span
                          style={{
                            marginTop: 6,
                            width: 6,
                            height: 6,
                            borderRadius: 999,
                            background: C.warn,
                            flexShrink: 0,
                          }}
                        />
                        <span>
                          <span style={{ fontWeight: 700 }}>{p.label}</span>
                          {p.note && (
                            <span style={{ color: C.textMute }}>
                              {" "}
                              — {p.note}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span style={{ whiteSpace: "pre-line" }}>
                    {reviewGeneralNote ||
                      "Vui lòng kiểm tra lại toàn bộ giấy tờ và thông tin đã nộp."}
                  </span>
                )}
                {reviewParts.length > 0 && reviewGeneralNote && (
                  <p
                    style={{
                      margin: "9px 0 0",
                      color: C.textMute,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {reviewGeneralNote}
                  </p>
                )}
              </div>
              <p
                style={{ margin: "8px 0 0", fontSize: 12, color: C.textFaint }}
              >
                Các phần được yêu cầu đã được để trống để bạn nộp lại; những
                phần khác vẫn được giữ nguyên.
              </p>
            </div>
          </div>
        )}

        {/* Stepper */}
        {step < 4 && (
          <div
            style={{
              background: C.panel,
              border: `1px solid ${C.borderSoft}`,
              borderRadius: 16,
              padding: "20px clamp(12px, 3.5vw, 24px) 16px",
              marginBottom: 22,
            }}
          >
            <Stepper current={step} onJump={setStep} />
          </div>
        )}

        {/* Card */}
        <div
          style={{
            background: C.panel,
            border: `1px solid ${C.borderSoft}`,
            borderRadius: 16,
            padding: "clamp(18px, 5vw, 30px)",
          }}
        >
          {/* ---------- STEP 0: CÁ NHÂN ---------- */}
          {step === 0 && (
            <div>
              <SectionTitle
                icon={User}
                sub="Thông tin định danh và liên hệ cơ bản"
              >
                Thông tin cá nhân
              </SectionTitle>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: autoCols(220),
                  gap: "0 20px",
                }}
              >
                <Field label="Họ và tên" required error={errors.fullName}>
                  <TextInput
                    icon={User}
                    placeholder="Nguyễn Văn A"
                    value={form.fullName}
                    error={!!errors.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                  />
                </Field>
                <Field
                  label="Số điện thoại"
                  required
                  error={errors.phone}
                  flag={reviewMap.phone}
                  id="kyc-field-phone"
                >
                  <TextInput
                    icon={Phone}
                    placeholder="0901234567"
                    value={form.phone}
                    error={!!errors.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                </Field>
              </div>

              <Field
                label="Chỗ ở hiện tại"
                required
                error={errors.currentAddress}
                hint="Dùng để phân công việc gần khu vực bạn sinh sống"
                flag={reviewMap.address}
                id="kyc-field-address"
              >
                <TextInput
                  icon={MapPin}
                  placeholder="Địa chỉ nơi bạn đang ở"
                  value={form.currentAddress}
                  error={!!errors.currentAddress}
                  onChange={(e) => set("currentAddress", e.target.value)}
                />
              </Field>

            </div>
          )}

          {/* ---------- STEP 1: XÁC MINH ---------- */}
          {step === 1 && (
            <div>
              <SectionTitle
                icon={ShieldCheck}
                sub="Cung cấp giấy tờ tùy thân để xác thực danh tính"
              >
                Xác minh danh tính
              </SectionTitle>

              <Field label="Số CCCD" required error={errors.cccdNumber}>
                <TextInput
                  icon={CreditCard}
                  placeholder="12 chữ số trên căn cước"
                  maxLength={12}
                  value={form.cccdNumber}
                  error={!!errors.cccdNumber}
                  onChange={(e) =>
                    set(
                      "cccdNumber",
                      e.target.value.replace(/\D/g, "").slice(0, 12),
                    )
                  }
                />
              </Field>

              <div
                id="kyc-field-citizenCard"
                style={{
                  display: "grid",
                  gridTemplateColumns: autoCols(200),
                  gap: 20,
                  marginTop: 6,
                }}
              >
                <UploadBox
                  label="Ảnh CCCD mặt trước"
                  value={cccdFront}
                  onChange={onSlot("cccdFront", setCccdFront)}
                  hint="Rõ nét, không lóa sáng"
                  error={errors.cccdFront}
                  flag={reviewMap.citizenCard}
                />
                <UploadBox
                  label="Ảnh CCCD mặt sau"
                  value={cccdBack}
                  onChange={onSlot("cccdBack", setCccdBack)}
                  hint="Hiển thị đầy đủ thông tin"
                  error={errors.cccdBack}
                  flag={reviewMap.citizenCard}
                />
              </div>

              <div id="kyc-field-idWithSelfie" style={{ marginTop: 20 }}>
                <UploadBox
                  label="Ảnh selfie"
                  value={selfie}
                  onChange={onSlot("selfie", setSelfie)}
                  aspect="4/2"
                  hint="Khuôn mặt và giấy tờ cùng khung hình"
                  error={errors.selfie}
                  flag={reviewMap.idWithSelfie}
                />
              </div>

              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  background: C.accentSoft,
                  border: `1px solid ${C.accentDim}`,
                  borderRadius: 10,
                  padding: "12px 14px",
                }}
              >
                <Camera
                  size={16}
                  style={{ color: C.accent, marginTop: 1, flexShrink: 0 }}
                />
                <span
                  style={{ fontSize: 12.5, color: C.textMute, lineHeight: 1.5 }}
                >
                  Ảnh selfie phải thấy rõ khuôn mặt và mặt trước CCCD trên cùng
                  một bức ảnh. Tránh đeo khẩu trang hoặc kính râm.
                </span>
              </div>
            </div>
          )}

          {/* ---------- STEP 2: PHÁP LÝ ---------- */}
          {step === 2 && (
            <div>
              <SectionTitle
                icon={FileText}
                sub="Thông tin thanh toán và giấy tờ pháp lý"
              >
                Pháp lý & thanh toán
              </SectionTitle>

              <div
                id="kyc-field-bankInfo"
                style={{
                  background: C.panelAlt,
                  border: `1px solid ${C.borderSoft}`,
                  borderRadius: 12,
                  padding: 18,
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  <Building2 size={15} style={{ color: C.accent }} />
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>
                    Tài khoản ngân hàng nhận thu nhập
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: autoCols(220),
                    gap: "0 18px",
                  }}
                >
                  <Field
                    label="Ngân hàng"
                    required
                    error={errors.bankName}
                    flag={reviewMap.bankInfo}
                  >
                    <BankSelect
                      value={form.bankBin}
                      onChange={(bin, shortName) => {
                        setForm((p) => ({ ...p, bankBin: bin, bankName: shortName }));
                        clearErr("bankName");
                      }}
                      placeholder="Chọn ngân hàng…"
                    />
                  </Field>
                  <Field
                    label="Số tài khoản"
                    required
                    error={errors.bankAccount}
                  >
                    <TextInput
                      icon={CreditCard}
                      placeholder="0123456789"
                      value={form.bankAccount}
                      error={!!errors.bankAccount}
                      onChange={(e) => set("bankAccount", e.target.value)}
                    />
                  </Field>
                </div>
                <Field
                  label="Chủ tài khoản"
                  required
                  error={errors.bankHolder}
                  hint="Phải trùng với họ tên trên CCCD"
                >
                  <TextInput
                    icon={User}
                    placeholder="NGUYEN VAN A"
                    value={form.bankHolder}
                    error={!!errors.bankHolder}
                    onChange={(e) =>
                      set("bankHolder", e.target.value.toUpperCase())
                    }
                  />
                </Field>
              </div>

              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.textMute,
                  display: "block",
                  marginBottom: 14,
                }}
              >
                Giấy tờ pháp lý
              </span>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: autoCols(160),
                  gap: 16,
                }}
              >
                <UploadBox
                  label="Lý lịch tư pháp *"
                  value={docJudicial}
                  onChange={onSlot("docJudicial", setDocJudicial)}
                  aspect="3/4"
                  error={errors.docJudicial}
                  flag={reviewMap.criminalRecord}
                  anchorId="kyc-field-criminalRecord"
                />
                <UploadBox
                  label="Giấy khám sức khỏe"
                  value={docHealth}
                  onChange={setDocHealth}
                  aspect="3/4"
                  flag={reviewMap.healthCertificate}
                  anchorId="kyc-field-healthCertificate"
                />
                <UploadBox
                  label="Chứng chỉ (nếu có)"
                  value={docCert}
                  onChange={setDocCert}
                  aspect="3/4"
                  flag={reviewMap.certificate}
                  anchorId="kyc-field-certificate"
                />
              </div>
            </div>
          )}

          {/* ---------- STEP 3: XÁC NHẬN ---------- */}
          {step === 3 && (
            <div>
              <SectionTitle
                icon={ClipboardCheck}
                sub="Kiểm tra lại toàn bộ thông tin trước khi gửi duyệt"
              >
                Xác nhận thông tin
              </SectionTitle>

              <ReviewGroup
                title="Cá nhân"
                onEdit={() => setStep(0)}
                rows={[
                  ["Họ và tên", form.fullName],
                  ["Số điện thoại", form.phone],
                  ["Chỗ ở hiện tại", form.currentAddress],
                ]}
              />

              <ReviewGroup
                title="Xác minh"
                onEdit={() => setStep(1)}
                rows={[["Số CCCD", form.cccdNumber]]}
                images={[
                  ["CCCD trước", cccdFront],
                  ["CCCD sau", cccdBack],
                  ["Selfie", selfie],
                ]}
              />

              <ReviewGroup
                title="Pháp lý & thanh toán"
                onEdit={() => setStep(2)}
                rows={[
                  ["Ngân hàng", form.bankName],
                  ["Số tài khoản", form.bankAccount],
                  ["Chủ tài khoản", form.bankHolder],
                ]}
                images={[
                  ["Tư pháp", docJudicial],
                  ["Sức khỏe", docHealth],
                  ["Chứng chỉ", docCert],
                ]}
              />

              <label
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  marginTop: 8,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  style={{ marginTop: 3, accentColor: C.accent }}
                />
                <span
                  style={{ fontSize: 12.5, color: C.textMute, lineHeight: 1.5 }}
                >
                  Tôi cam kết thông tin và giấy tờ cung cấp là chính xác, đồng ý
                  để CleanZ xác minh và xử lý theo điều khoản dịch vụ.
                </span>
              </label>
            </div>
          )}

          {/* ---------- STEP 4: HOÀN TẤT ---------- */}
          {step === 4 && (
            <div style={{ textAlign: "center", padding: "20px 0 14px" }}>
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 22,
                  background: C.accentSoft,
                  border: `1px solid ${C.accentDim}`,
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 22px",
                }}
              >
                <PartyPopper size={34} style={{ color: C.accent }} />
              </div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
                Đã gửi hồ sơ thành công
              </h2>
              <p
                style={{
                  margin: "12px auto 0",
                  maxWidth: 420,
                  fontSize: 14,
                  color: C.textFaint,
                  lineHeight: 1.6,
                }}
              >
                Hồ sơ của bạn đang chờ duyệt. Đội ngũ CleanZ sẽ xem xét trong
                24–48 giờ và gửi kết quả qua email{" "}
                <span style={{ color: C.text, fontWeight: 600 }}>
                  {user?.email || "đã đăng ký"}
                </span>
                .
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 8,
                  maxWidth: 520,
                  margin: "24px auto 0",
                  textAlign: "left",
                }}
                aria-label="Tiến trình xét duyệt hồ sơ"
              >
                {[
                  ["1", "Đã nộp", true],
                  ["2", "Đang xét duyệt", true],
                  ["3", "Kết quả", false],
                ].map(([number, label, active]) => (
                  <div
                    key={String(number)}
                    style={{
                      borderTop: `3px solid ${active ? C.accent : C.border}`,
                      paddingTop: 9,
                    }}
                  >
                    <div style={{ fontSize: 11, color: C.textFaint }}>
                      Bước {number}
                    </div>
                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: active ? C.text : C.textFaint,
                      }}
                    >
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  justifyContent: "center",
                  marginTop: 26,
                  flexWrap: "wrap",
                }}
              >
                {[
                  [
                    "Mã hồ sơ",
                    profile?.id
                      ? `#${profile.id.slice(0, 8).toUpperCase()}`
                      : "Đang cấp",
                  ],
                  ["Trạng thái", "Chờ duyệt"],
                  ["Dự kiến", "24–48 giờ"],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      background: C.panelAlt,
                      border: `1px solid ${C.borderSoft}`,
                      borderRadius: 11,
                      padding: "14px 20px",
                      minWidth: 130,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11.5,
                        color: C.textFaint,
                        marginBottom: 5,
                      }}
                    >
                      {k}
                    </div>
                    <div
                      style={{ fontSize: 14, fontWeight: 700, color: C.text }}
                    >
                      {v}
                    </div>
                  </div>
                ))}
              </div>

              <p
                style={{
                  margin: "18px 0 0",
                  fontSize: 12,
                  color: C.textFaint,
                }}
              >
                Cập nhật gần nhất:{" "}
                {profile?.updatedAt
                  ? new Intl.DateTimeFormat("vi-VN", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(profile.updatedAt))
                  : "Vừa xong"}
              </p>
              <button
                type="button"
                onClick={() => void refetchProfile()}
                disabled={isProfileFetching}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  marginTop: 14,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  background: "transparent",
                  color: C.text,
                  padding: "10px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isProfileFetching ? "wait" : "pointer",
                  opacity: isProfileFetching ? 0.65 : 1,
                }}
              >
                <RefreshCw
                  size={15}
                  className={isProfileFetching ? "animate-spin" : undefined}
                />
                Kiểm tra trạng thái
              </button>
            </div>
          )}

          {/* ---------- NAV ---------- */}
          {step < 4 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 30,
                paddingTop: 22,
                borderTop: `1px solid ${C.borderSoft}`,
              }}
            >
              <button
                type="button"
                onClick={back}
                disabled={step === 0 || submitting}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "transparent",
                  border: `1px solid ${C.border}`,
                  color: step === 0 ? C.textFaint : C.text,
                  borderRadius: 10,
                  padding: "11px clamp(13px, 4vw, 18px)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: step === 0 ? "not-allowed" : "pointer",
                  opacity: step === 0 ? 0.5 : 1,
                }}
              >
                <ChevronLeft size={16} /> Quay lại
              </button>

              <span style={{ fontSize: 12.5, color: C.textFaint }}>
                Bước {step + 1} / 4
              </span>

              <button
                type="button"
                onClick={next}
                disabled={submitting}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: C.accent,
                  border: "none",
                  color: C.onAccent,
                  borderRadius: 10,
                  padding: "11px clamp(15px, 4vw, 22px)",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: submitting ? "wait" : "pointer",
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Đang gửi…
                  </>
                ) : (
                  <>
                    {step === 3 ? "Gửi duyệt" : "Tiếp tục"}
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
