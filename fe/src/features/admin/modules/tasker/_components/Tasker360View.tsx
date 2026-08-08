"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge, type BadgeTone } from "@/components/admin";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  useAdminTaskerDetail,
  useAdminTaskerDocuments,
  useAdminTaskerPenalties,
} from "../hooks/admin-tasker.hooks";
import { TaskerStatusToggle } from "./TaskerStatusToggle";
import { TaskerFinanceTab } from "./TaskerFinanceTab";
import { TaskerServicesTab } from "./TaskerServicesTab";
import { TaskerEquipmentsTab } from "./TaskerEquipmentsTab";
import { TaskerScheduleTab } from "./TaskerScheduleTab";
import { TaskerReviewsTab } from "./TaskerReviewsTab";
import { TaskerPremiumReviewPanel } from "./TaskerPremiumReviewPanel";
import { parseAdminNotes } from "./AdminRequestInfoModal";
import {
  ACCOUNT_STATUS_LABELS,
  DOC_STATUS_LABELS,
  formatDateVN,
} from "../constants";
import type { AdminTaskerDetail } from "../types/admin-tasker.types";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Hash,
  Star,
  Sparkles,
  Briefcase,
  Clock,
  Crown,
  Award,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Fingerprint,
  FileText,
  Wallet,
  ZoomIn,
  ClipboardList,
  Construction,
  User,
  IdCard,
  ScanFace,
  Scale,
  HeartPulse,
  Award as AwardIcon,
  ImageIcon,
  AlertTriangle,
  Minus,
  AlertCircle,
  RotateCcw,
  History,
  PackageOpen,
  TrendingUp,
  TrendingDown,
  Activity,
  MessageSquare,
} from "lucide-react";

interface Tasker360ViewProps {
  taskerId: string;
  initialTab?: "overview" | "services" | "finance" | "reviews" | "schedule" | "premium";
}

interface TaskerPenalty {
  id: string;
  reason: string;
  type: string;
  createdAt: string;
  endsAt: string | null;
  createdBy?: { fullName?: string };
}

// Account status → semantic badge tone (design system §2).
const ACCOUNT_STATUS_TONE: Record<string, BadgeTone> = {
  PENDING: "warning",
  TRAINING: "info",
  ACTIVE: "success",
  SUSPENDED: "warning",
  REJECTED: "danger",
  TERMINATED: "danger",
};

const PENALTY_TYPE_LABELS: Record<string, string> = {
  DAYS_2: "Khóa 2 ngày",
  DAYS_7: "Khóa 7 ngày",
  TEMPORARY: "Đình chỉ tạm thời",
  PERMANENT: "Khóa vĩnh viễn",
};

// ─── Identity & legal document groups (đồng bộ với màn duyệt hồ sơ) ────────────

interface DocGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  required: boolean;
  hint?: string;
}

const DOC_GROUPS: DocGroup[] = [
  {
    id: "citizenCard",
    label: "CCCD / CMND (2 mặt)",
    icon: IdCard,
    required: true,
    hint: "Rõ nét, đủ 2 mặt",
  },
  {
    id: "idWithSelfie",
    label: "Ảnh selfie",
    icon: ScanFace,
    required: false,
    hint: "Nhìn thẳng, rõ mặt",
  },
  {
    id: "criminalRecord",
    label: "Lý lịch tư pháp",
    icon: Scale,
    required: false,
  },
  {
    id: "healthCertificate",
    label: "Giấy khám sức khoẻ",
    icon: HeartPulse,
    required: false,
  },
  {
    id: "certificate",
    label: "Chứng chỉ nghề nghiệp",
    icon: AwardIcon,
    required: false,
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (value?: string | null) => {
  if (!value) return "Chưa cập nhật";
  return new Date(value).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const maskAccount = (value?: string | null) => {
  if (!value) return "•••• •••• ••••";
  const last4 = value.slice(-4);
  return `•••• •••• •••• ${last4}`;
};

const initialsOf = (name?: string | null) =>
  name
    ? name
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "T";

// ─── Sub-components ─────────────────────────────────────────────────────────

const InfoRow: React.FC<{
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}> = ({ icon: Icon, label, value, mono }) => (
  <div className="flex items-center justify-between gap-4 py-2.5 border-b border-(--c-line) last:border-0">
    <span className="flex items-center gap-2 text-sm text-(--c-muted) shrink-0">
      <Icon className="w-4 h-4 text-(--c-muted)" aria-hidden="true" />
      {label}
    </span>
    <span
      className={cn(
        "text-sm font-semibold text-right text-(--c-ink) wrap-break-word",
        mono && "font-mono tracking-tight",
      )}
    >
      {value}
    </span>
  </div>
);

const StatCard: React.FC<{
  icon: React.ElementType;
  value: React.ReactNode;
  label: string;
  tone: "emerald" | "blue" | "amber" | "rose";
  trend?: string;
  trendUp?: boolean;
}> = ({ icon: Icon, value, label, tone, trend, trendUp }) => {
  const tones = {
    emerald: "bg-[rgba(14,159,110,0.12)] text-[#0E9F6E]",
    blue: "bg-[rgba(37,99,235,0.12)] text-[#2563EB]",
    amber: "bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)]",
    rose: "bg-[rgba(225,29,72,0.12)] text-[#E11D48]",
  };
  return (
    <div className="bg-(--c-card) border border-(--c-line) rounded-2xl p-5 flex flex-col justify-between group hover:border-(--c-line-strong) transition-colors shadow-sm">
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
            tones[tone],
          )}
        >
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
            trendUp ? "bg-[#0E9F6E]/10 text-[#0E9F6E]" : "bg-[#E11D48]/10 text-[#E11D48]"
          )}>
            {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend}
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-(--c-muted) mb-1">
          {label}
        </p>
        <p className="text-2xl font-black leading-none text-(--c-ink)">
          {value}
        </p>
      </div>
    </div>
  );
};

const ComingSoon: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
}> = ({ icon: Icon, title, description }) => (
  <div className="border border-dashed border-(--c-line-strong) rounded-2xl py-16 px-6 flex flex-col items-center text-center gap-3 bg-(--c-card-2)">
    <div className="w-14 h-14 rounded-2xl bg-(--c-card-2) flex items-center justify-center text-(--c-muted)">
      <Icon className="w-7 h-7" aria-hidden="true" />
    </div>
    <div className="flex items-center gap-2">
      <h3 className="font-bold text-base text-(--c-ink)">{title}</h3>
      <Badge
        variant="outline"
        className="text-[10px] font-bold uppercase tracking-wider bg-(--c-primary-soft) text-(--c-primary-strong) border-(--c-primary)/20 gap-1"
      >
        <Construction className="w-3 h-3" aria-hidden="true" /> Đang phát triển
      </Badge>
    </div>
    <p className="text-sm text-(--c-muted) max-w-md">{description}</p>
  </div>
);

// ─── Document group card (read-only detail view — không có nút duyệt) ─────────

const DocGroupCard: React.FC<{
  group: DocGroup;
  docs: Array<{ id: string; fileUrl: string }>;
  onZoom: (url: string) => void;
}> = ({ group, docs, onZoom }) => (
  <div className="rounded-2xl border border-(--c-line) bg-(--c-card) p-5">
    <div className="mb-3">
      <p className="text-sm font-bold flex items-center gap-2 text-(--c-ink)">
        <group.icon
          className="w-4 h-4 text-(--c-primary-strong)"
          aria-hidden="true"
        />{" "}
        {group.label}
        {!group.required && (
          <span className="text-[10px] font-normal text-(--c-muted)">
            (tuỳ chọn)
          </span>
        )}
      </p>
      <p
        className={cn(
          "text-xs mt-0.5 flex items-center gap-1",
          docs.length > 0
            ? "text-[#0E9F6E]"
            : group.required
              ? "text-[#E11D48]"
              : "text-(--c-muted)",
        )}
      >
        {docs.length > 0 ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Đã nộp{" "}
            {docs.length} ảnh
          </>
        ) : group.required ? (
          <>
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> Chưa
            nộp
          </>
        ) : (
          <>
            <Minus className="w-3.5 h-3.5" aria-hidden="true" /> Chưa nộp (không
            bắt buộc)
          </>
        )}
        {group.hint && docs.length > 0 && (
          <span className="text-(--c-muted)"> • {group.hint}</span>
        )}
      </p>
    </div>

    {docs.length > 0 ? (
      <div className="grid sm:grid-cols-2 gap-3">
        {docs.map((doc, idx) => (
          <button
            key={doc.id}
            type="button"
            onClick={() => onZoom(doc.fileUrl)}
            className="group relative aspect-video rounded-xl border border-(--c-line) overflow-hidden bg-(--c-card-2)"
          >
            <img
              src={doc.fileUrl}
              alt={`${group.label} ${idx + 1}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-white/90 text-gray-900 rounded-full px-3 py-1.5 text-xs font-semibold shadow">
                <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" /> Xem ảnh
              </span>
            </div>
            {docs.length > 1 && (
              <Badge className="absolute top-2 left-2 bg-black/60 text-white border-none text-[10px]">
                Ảnh {idx + 1}
              </Badge>
            )}
          </button>
        ))}
      </div>
    ) : (
      <div className="border border-dashed border-(--c-line-strong) rounded-xl py-8 flex flex-col items-center gap-2 text-center">
        <ImageIcon
          className="w-8 h-8 text-(--c-muted)/50"
          aria-hidden="true"
        />
        <p className="text-xs text-(--c-muted)">Ứng viên chưa tải lên</p>
      </div>
    )}
  </div>
);

// ─── Main view ──────────────────────────────────────────────────────────────

export const Tasker360View: React.FC<Tasker360ViewProps> = ({
  taskerId,
  initialTab = "overview",
}) => {
  const router = useRouter();
  const {
    data: tasker,
    isLoading,
    isError,
    error,
    refetch,
  } = useAdminTaskerDetail(taskerId);
  const { data: docsData, isLoading: isDocsLoading } =
    useAdminTaskerDocuments(taskerId);
  const { data: penaltiesData } = useAdminTaskerPenalties(taskerId);
  const [lightbox, setLightbox] = React.useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const errorStatus = (error as { response?: { status?: number } })?.response
    ?.status;
  const isNotFound = errorStatus === 404;

  // Lỗi thực sự (500/mạng), không phải 404 — cho phép người dùng thử lại.
  if (isError && !isNotFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
        <AlertTriangle
          className="w-16 h-16 text-(--c-muted)/40"
          aria-hidden="true"
        />
        <h2 className="text-xl font-bold text-(--c-ink)">
          Không tải được dữ liệu đối tác
        </h2>
        <p className="text-(--c-muted)">
          Đã có lỗi xảy ra khi tải thông tin đối tác. Vui lòng thử lại.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="border-(--c-line-strong) bg-(--c-card) text-(--c-ink-soft) hover:text-(--c-ink)"
          >
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" /> Quay lại
          </Button>
          <Button
            onClick={() => refetch()}
            className="bg-(--c-primary) text-white hover:bg-(--c-primary)/90"
          >
            <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" /> Thử lại
          </Button>
        </div>
      </div>
    );
  }

  // 404 thật hoặc query thành công nhưng không có dữ liệu.
  if (!tasker) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
        <User
          className="w-16 h-16 text-(--c-muted)/40"
          aria-hidden="true"
        />
        <h2 className="text-xl font-bold text-(--c-ink)">
          Không tìm thấy đối tác
        </h2>
        <p className="text-(--c-muted)">
          Dữ liệu đã bị xóa hoặc ID không hợp lệ.
        </p>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="border-(--c-line-strong) bg-(--c-card) text-(--c-ink-soft) hover:text-(--c-ink)"
        >
          <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" /> Quay lại
        </Button>
      </div>
    );
  }

  const detail = tasker as AdminTaskerDetail;
  const email = detail.user?.email ?? "Chưa cập nhật";
  const phone = detail.phone ?? detail.user?.phone ?? "Chưa cập nhật";
  const rating = detail.stats?.ratingAvg || detail.avgRating || 0;
  const skills = (detail.skills ?? "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const docs = (docsData?.documents ?? []).filter((d) => d.fileUrl) as Array<{
    id: string;
    type: string;
    fileUrl: string;
  }>;
  const getDocsByType = (type: string) => docs.filter((d) => d.type === type);
  const completedDocs = DOC_GROUPS.filter(
    (g) => getDocsByType(g.id).length > 0,
  ).length;

  const parsedNotes = parseAdminNotes(detail.adminNotes);
  const penalties = (penaltiesData ?? []) as TaskerPenalty[];

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-semibold text-(--c-muted) hover:text-(--c-ink) transition-colors group"
      >
        <ArrowLeft
          className="w-4 h-4 group-hover:-translate-x-1 transition-transform"
          aria-hidden="true"
        />
        Quay lại danh sách Tasker
      </button>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-[#0D1B3E] text-white p-6 sm:p-7">
        <div
          className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-(--c-primary)/25 blur-2xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-wrap items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center text-3xl font-black shrink-0 ring-1 ring-inset ring-white/20 overflow-hidden">
            {detail.avatarUrl ? (
              <img
                src={detail.avatarUrl}
                alt={detail.fullName ?? ""}
                className="w-full h-full object-cover"
              />
            ) : (
              initialsOf(detail.fullName)
            )}
          </div>

          <div className="flex-1 min-w-65">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {detail.fullName || "Chưa cập nhật"}
              </h1>
              <StatusBadge
                tone={ACCOUNT_STATUS_TONE[detail.status] ?? "neutral"}
              >
                {ACCOUNT_STATUS_LABELS[detail.status] || detail.status}
              </StatusBadge>
              <Badge
                variant="outline"
                className="text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white border-white/20 gap-1"
              >
                <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                {DOC_STATUS_LABELS[detail.approvalStatus] ||
                  detail.approvalStatus}
              </Badge>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-white/75">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" aria-hidden="true" /> {phone}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" aria-hidden="true" /> {email}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" aria-hidden="true" />{" "}
                {detail.workingAddress || "Chưa cập nhật khu vực"}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" aria-hidden="true" /> Tham gia{" "}
                {formatDate(detail.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-3">
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-3">
              <Star
                className="w-7 h-7 text-(--c-primary) fill-(--c-primary)"
                aria-hidden="true"
              />
              <div>
                <p className="text-2xl font-black leading-none">
                  {rating > 0 ? rating.toFixed(1) : "—"}
                </p>
                <p className="text-xs text-white/60 mt-1">
                  {detail.stats?.totalCompletedJobs ?? detail.totalJobs ?? 0} ca
                  hoàn thành
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full" onClick={(e) => e.stopPropagation()}>
              <Button 
                onClick={() => {
                  if (detail.phone) {
                    window.open(`tel:${detail.phone}`, "_self");
                  }
                }}
                size="icon" 
                variant="secondary" 
                className="bg-white/10 hover:bg-white/20 text-white border-0 h-10 w-10 shrink-0 rounded-xl" 
                title="Gọi điện"
              >
                <Phone className="w-4 h-4" />
              </Button>
              <Button 
                onClick={() => {
                  toast.info("Tính năng Chat nội bộ đang được phát triển.");
                }}
                size="icon" 
                variant="secondary" 
                className="bg-white/10 hover:bg-white/20 text-white border-0 h-10 w-10 shrink-0 rounded-xl" 
                title="Nhắn tin"
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
              <div className="flex-1 min-w-35">
                <TaskerStatusToggle
                  taskerId={detail.id}
                  status={detail.status}
                  fullName={detail.fullName || "tasker"}
                  cancelSuspendedUntil={detail.cancelSuspendedUntil}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="w-full h-auto flex-wrap justify-start gap-2.5 rounded-none bg-transparent border-0 p-0">
          <TabsTrigger
            value="overview"
            className="flex-none h-11 px-4 gap-2 text-sm font-semibold rounded-xl border border-(--c-line) bg-(--c-card) text-(--c-muted) transition-colors hover:bg-(--c-card-2) hover:text-(--c-ink) data-[state=active]:bg-(--c-primary) data-[state=active]:text-white data-[state=active]:border-(--c-primary) data-[state=active]:shadow-sm data-[state=active]:font-bold"
          >
            <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" /> Tổng quan
          </TabsTrigger>
          <TabsTrigger
            value="services"
            className="flex-none h-11 px-4 gap-2 text-sm font-semibold rounded-xl border border-(--c-line) bg-(--c-card) text-(--c-muted) transition-colors hover:bg-(--c-card-2) hover:text-(--c-ink) data-[state=active]:bg-(--c-primary) data-[state=active]:text-white data-[state=active]:border-(--c-primary) data-[state=active]:shadow-sm data-[state=active]:font-bold"
          >
            <Briefcase className="w-3.5 h-3.5" aria-hidden="true" /> Dịch vụ & Hồ sơ
          </TabsTrigger>
          <TabsTrigger
            value="equipments"
            className="relative flex-none h-11 px-4 gap-2 text-sm font-semibold rounded-xl border border-(--c-line) bg-(--c-card) text-(--c-muted) transition-colors hover:bg-(--c-card-2) hover:text-(--c-ink) data-[state=active]:bg-(--c-primary) data-[state=active]:text-white data-[state=active]:border-(--c-primary) data-[state=active]:shadow-sm data-[state=active]:font-bold"
          >
            <PackageOpen className="w-3.5 h-3.5" aria-hidden="true" /> Trang bị & Premium
            {detail.equipment?.status === "PENDING" && (
              <span
                className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 size-2.5 rounded-full bg-[#E11D48] ring-2 ring-(--c-card) data-[state=active]:ring-(--c-primary) animate-pulse"
                aria-label="Có hồ sơ chờ duyệt"
              />
            )}
          </TabsTrigger>
          {/* <TabsTrigger
            value="schedule"
            className="flex-none h-11 px-4 gap-2 text-sm font-semibold rounded-xl border border-(--c-line) bg-(--c-card) text-(--c-muted) transition-colors hover:bg-(--c-card-2) hover:text-(--c-ink) data-[state=active]:bg-(--c-primary) data-[state=active]:text-white data-[state=active]:border-(--c-primary) data-[state=active]:shadow-sm data-[state=active]:font-bold"
          >
            <Calendar className="w-3.5 h-3.5" aria-hidden="true" /> Lịch & Khu vực
          </TabsTrigger> */}
          <TabsTrigger
            value="finance"
            className="flex-none h-11 px-4 gap-2 text-sm font-semibold rounded-xl border border-(--c-line) bg-(--c-card) text-(--c-muted) transition-colors hover:bg-(--c-card-2) hover:text-(--c-ink) data-[state=active]:bg-(--c-primary) data-[state=active]:text-white data-[state=active]:border-(--c-primary) data-[state=active]:shadow-sm data-[state=active]:font-bold"
          >
            <Wallet className="w-3.5 h-3.5" aria-hidden="true" /> Tài chính & Ví
          </TabsTrigger>
          <TabsTrigger
            value="reviews"
            className="flex-none h-11 px-4 gap-2 text-sm font-semibold rounded-xl border border-(--c-line) bg-(--c-card) text-(--c-muted) transition-colors hover:bg-(--c-card-2) hover:text-(--c-ink) data-[state=active]:bg-(--c-primary) data-[state=active]:text-white data-[state=active]:border-(--c-primary) data-[state=active]:shadow-sm data-[state=active]:font-bold"
          >
            <Star className="w-3.5 h-3.5" aria-hidden="true" /> Đánh giá & Sự cố
          </TabsTrigger>
        </TabsList>

        {/* ── Tổng quan ── */}
        <TabsContent value="overview" className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={CheckCircle2}
              tone="emerald"
              value={detail.stats?.totalCompletedJobs ?? detail.totalJobs ?? 0}
              label="Đơn hoàn thành"
              trend="+12%"
              trendUp={true}
            />
            <StatCard
              icon={Clock}
              tone="blue"
              value={`${detail.stats?.totalWorkingHours ?? 0}h`}
              label="Tổng giờ làm việc"
              trend="+5%"
              trendUp={true}
            />
            <StatCard
              icon={Award}
              tone="amber"
              value={detail.stats?.totalPoints ?? 0}
              label="Điểm thưởng"
              trend="+120"
              trendUp={true}
            />
            <StatCard
              icon={AlertTriangle}
              tone="rose"
              value="4.2%"
              label="Tỷ lệ hủy ca"
              trend="-1.2%"
              trendUp={true}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-(--c-card) border border-(--c-line) rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold flex items-center gap-2 text-(--c-ink)">
                    <User className="w-5 h-5 text-(--c-primary-strong)" aria-hidden="true" />
                    Hồ sơ đối tác
                  </h3>
                  <Badge variant="outline" className="bg-(--c-card-2) text-(--c-ink-soft) font-mono text-xs">
                    {detail.id.slice(0, 8)}...
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 px-0.5">
                  <div className="space-y-1">
                    <p className="text-xs text-(--c-muted) flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Họ và tên</p>
                    <p className="text-sm font-semibold text-(--c-ink)">{detail.fullName || "Chưa cập nhật"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-(--c-muted) flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Số điện thoại</p>
                    <p className="text-sm font-semibold font-mono text-(--c-ink)">{phone}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-(--c-muted) flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</p>
                    <p className="text-sm font-semibold text-(--c-ink) break-all">{email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-(--c-muted) flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Khu vực HĐ</p>
                    <p className="text-sm font-semibold text-(--c-ink)">{detail.workingAddress || "Chưa cập nhật"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-(--c-muted) flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Tham gia</p>
                    <p className="text-sm font-semibold text-(--c-ink)">{formatDate(detail.createdAt)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-(--c-muted) flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Kinh nghiệm</p>
                    <p className="text-sm font-semibold text-(--c-ink)">{detail.experience || "Chưa cập nhật"}</p>
                  </div>
                </div>

                <div className="mt-5 pt-5 border-t border-(--c-line)">
                  <p className="text-xs font-semibold text-(--c-muted) mb-3">KỸ NĂNG CHUYÊN MÔN</p>
                  {skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <span
                          key={skill}
                          className="text-xs font-medium bg-(--c-primary)/10 text-(--c-primary-strong) rounded-full px-3 py-1.5 border border-(--c-primary)/20"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-(--c-muted) italic">Chưa cập nhật kỹ năng.</p>
                  )}
                </div>

                <div className="mt-5 pt-5 border-t border-(--c-line)">
                  <p className="text-xs font-semibold text-(--c-muted) mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                    <CreditCard className="w-4 h-4" /> Thông tin thanh toán (Ngân hàng)
                  </p>
                  {detail.bank?.name || detail.bank?.accountNumber ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 bg-(--c-card-2) p-4 rounded-xl border border-(--c-line)">
                      <div className="space-y-1">
                        <p className="text-xs text-(--c-muted)">Ngân hàng</p>
                        <p className="text-sm font-semibold text-(--c-ink)">{detail.bank.name || "—"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-(--c-muted)">Số tài khoản</p>
                        <p className="text-sm font-semibold font-mono text-(--c-primary-strong)">{detail.bank.accountNumber || "—"}</p>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <p className="text-xs text-(--c-muted)">Chủ tài khoản</p>
                        <p className="text-sm font-semibold uppercase tracking-wide text-(--c-ink)">{detail.bank.accountName || "—"}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-(--c-muted) italic bg-(--c-card-2) p-3 rounded-lg text-center border border-(--c-line) border-dashed">
                      Tasker chưa cập nhật thông tin thanh toán.
                    </p>
                  )}
                </div>
                <div className="mt-5 pt-5 border-t border-(--c-line)">
                  <p className="text-xs font-semibold text-(--c-muted) mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4" /> Tiến độ hồ sơ (KYC)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-(--c-card-2) p-4 rounded-xl border border-(--c-line)">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0", detail.hasCitizenCardImage ? "bg-[#0E9F6E]/20 text-[#0E9F6E]" : "bg-(--c-line-strong) text-(--c-muted)")}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <span className={cn("text-sm font-semibold", detail.hasCitizenCardImage ? "text-(--c-ink)" : "text-(--c-muted) line-through opacity-70")}>CCCD / CMND (2 mặt)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0", detail.hasIdWithSelfieImage ? "bg-[#0E9F6E]/20 text-[#0E9F6E]" : "bg-(--c-line-strong) text-(--c-muted)")}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <span className={cn("text-sm font-semibold", detail.hasIdWithSelfieImage ? "text-(--c-ink)" : "text-(--c-muted) line-through opacity-70")}>Ảnh chân dung</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0", detail.hasCriminalRecordImage ? "bg-[#0E9F6E]/20 text-[#0E9F6E]" : "bg-(--c-line-strong) text-(--c-muted)")}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <span className={cn("text-sm font-semibold", detail.hasCriminalRecordImage ? "text-(--c-ink)" : "text-(--c-muted) line-through opacity-70")}>Lý lịch tư pháp</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0", detail.hasHealthCertificateImage ? "bg-[#0E9F6E]/20 text-[#0E9F6E]" : "bg-(--c-line-strong) text-(--c-muted)")}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <span className={cn("text-sm font-semibold", detail.hasHealthCertificateImage ? "text-(--c-ink)" : "text-(--c-muted) line-through opacity-70")}>Giấy khám sức khỏe</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0", detail.hasCertificateImage ? "bg-[#0E9F6E]/20 text-[#0E9F6E]" : "bg-(--c-line-strong) text-(--c-muted)")}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <span className={cn("text-sm font-semibold", detail.hasCertificateImage ? "text-(--c-ink)" : "text-(--c-muted) line-through opacity-70")}>Chứng chỉ nghề</span>
                    </div>
                  </div>
                </div>

                {(detail.docReviewedByName || detail.updatedByName) && (
                  <div className="mt-5 pt-4 border-t border-(--c-line) flex flex-wrap gap-4 bg-(--c-card-2) p-3 rounded-xl">
                    {detail.docReviewedByName && (
                      <p className="flex items-center gap-1.5 text-xs text-(--c-muted)">
                        <ShieldCheck className="w-4 h-4 text-[#0E9F6E]" aria-hidden="true" />
                        Duyệt bởi: <span className="font-semibold text-(--c-ink)">{detail.docReviewedByName}</span>
                      </p>
                    )}
                    {detail.updatedByName && (
                      <p className="flex items-center gap-1.5 text-xs text-(--c-muted)">
                        <History className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                        Cập nhật bởi: <span className="font-semibold text-(--c-ink)">{detail.updatedByName}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              {/* Optional Bio section if available */}
              {detail.bio && (
                <div className="bg-(--c-card) border border-(--c-line) rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-(--c-ink)">
                    <FileText className="w-4 h-4 text-(--c-primary-strong)" aria-hidden="true" />
                    Giới thiệu bản thân
                  </h3>
                  <p className="text-sm text-(--c-ink-soft) leading-relaxed bg-(--c-card-2) p-4 rounded-xl">
                    {detail.bio}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-(--c-card) border border-(--c-line) rounded-2xl p-5 shadow-sm h-full flex flex-col">
                <h3 className="text-base font-bold flex items-center gap-2 mb-4 text-(--c-ink)">
                  <Activity className="w-5 h-5 text-(--c-primary-strong)" aria-hidden="true" />
                  Hoạt động gần đây
                </h3>
                
                <div className="flex-1 relative">
                  <div className="absolute left-2.75 top-2 bottom-2 w-px bg-(--c-line-strong)" />
                  <div className="space-y-5 relative">
                    <div className="flex gap-4">
                      <div className="w-6 h-6 rounded-full bg-[#0E9F6E]/20 flex items-center justify-center shrink-0 ring-4 ring-(--c-card) relative z-10">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0E9F6E]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-(--c-ink)">Hoàn thành ca làm việc</p>
                        <p className="text-xs text-(--c-muted) mt-0.5">Hôm nay, 14:30 • Dọn dẹp nhà cửa</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="w-6 h-6 rounded-full bg-[#2563EB]/20 flex items-center justify-center shrink-0 ring-4 ring-(--c-card) relative z-10">
                        <Wallet className="w-3.5 h-3.5 text-[#2563EB]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-(--c-ink)">Rút tiền thành công</p>
                        <p className="text-xs text-(--c-muted) mt-0.5">Hôm qua, 09:15 • 500,000đ</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="w-6 h-6 rounded-full bg-(--c-primary)/20 flex items-center justify-center shrink-0 ring-4 ring-(--c-card) relative z-10">
                        <Star className="w-3.5 h-3.5 text-(--c-primary-strong)" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-(--c-ink)">Nhận đánh giá 5 sao</p>
                        <p className="text-xs text-(--c-muted) mt-0.5">2 ngày trước • Nhân viên nhiệt tình...</p>
                      </div>
                    </div>
                    
                    {penalties.length > 0 && (
                      <div className="flex gap-4">
                        <div className="w-6 h-6 rounded-full bg-[#E11D48]/20 flex items-center justify-center shrink-0 ring-4 ring-(--c-card) relative z-10">
                          <AlertCircle className="w-3.5 h-3.5 text-[#E11D48]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-(--c-ink)">Bị ghi nhận vi phạm</p>
                          <p className="text-xs text-(--c-muted) mt-0.5">{formatDateVN(penalties[0].createdAt)} • {penalties[0].reason}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <Button 
                  variant="ghost" 
                  className="w-full mt-4 text-xs font-semibold text-(--c-primary)"
                  onClick={() => {
                    document.querySelector<HTMLButtonElement>('button[value="reviews"]')?.click();
                    toast.info("Chuyển đến tab Đánh giá & Sự cố để xem chi tiết");
                  }}
                >
                  Xem toàn bộ lịch sử
                </Button>
              </div>
            </div>
          </div>

          {/* Admin notes */}
          {parsedNotes ? (
            <div className="rounded-2xl border border-[rgba(37,99,235,0.3)] bg-[rgba(37,99,235,0.06)] p-5">
              <p className="text-[10px] uppercase font-bold tracking-wider text-[#2563EB] mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" /> Ghi
                chú của admin
              </p>
              {parsedNotes.itemLabels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {parsedNotes.itemLabels.map((label) => (
                    <Badge
                      key={label}
                      variant="outline"
                      className="text-xs bg-(--c-card) border-(--c-line) text-(--c-ink-soft)"
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              )}
              {parsedNotes.note && (
                <p className="text-sm text-(--c-ink-soft) italic leading-relaxed">
                  &ldquo;{parsedNotes.note}&rdquo;
                </p>
              )}
            </div>
          ) : (
            detail.adminNotes && (
              <div className="rounded-2xl border border-[rgba(37,99,235,0.3)] bg-[rgba(37,99,235,0.06)] p-5">
                <p className="text-[10px] uppercase font-bold tracking-wider text-[#2563EB] mb-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" /> Ghi
                  chú của admin
                </p>
                <p className="text-sm text-(--c-ink-soft) whitespace-pre-wrap leading-relaxed">
                  {detail.adminNotes}
                </p>
              </div>
            )
          )}

          {/* Ban reason */}
          {detail.banReason && (
            <div className="rounded-2xl border border-[rgba(225,29,72,0.3)] bg-[rgba(225,29,72,0.06)] p-5">
              <p className="text-[10px] uppercase font-bold tracking-wider text-[#E11D48] mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" /> Lý do
                khóa tài khoản
              </p>
              <p className="text-sm text-(--c-ink-soft) leading-relaxed">
                {detail.banReason}
              </p>
            </div>
          )}

          {/* Penalties */}
          {penalties.length > 0 && (
            <div className="bg-(--c-card) border border-(--c-line) rounded-2xl p-5">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-(--c-ink)">
                <AlertCircle
                  className="w-4 h-4 text-(--c-primary-strong)"
                  aria-hidden="true"
                />
                Lịch sử kỷ luật
              </h3>
              <div className="space-y-3">
                {penalties.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-(--c-line) p-4 space-y-2 bg-(--c-card-2)"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <Badge
                         variant="outline"
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 uppercase tracking-widest",
                          p.type === "PERMANENT"
                            ? "bg-[rgba(225,29,72,0.12)] text-[#E11D48] border-[rgba(225,29,72,0.3)]"
                            : "bg-[rgba(217,119,6,0.14)] text-[#D97706] border-[rgba(217,119,6,0.3)]",
                        )}
                      >
                        {PENALTY_TYPE_LABELS[p.type] || p.type}
                      </Badge>
                      <span className="text-xs text-(--c-muted)">
                        {formatDateVN(p.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-(--c-ink) font-medium leading-relaxed">
                      {p.reason}
                    </p>
                    <div className="text-[11px] text-(--c-muted) flex justify-between gap-2 pt-1 border-t border-(--c-line)">
                      <span>
                        Người xử lý:{" "}
                        <span className="font-semibold text-(--c-ink)">
                          {p.createdBy?.fullName || "Admin"}
                        </span>
                      </span>
                      {p.endsAt && (
                        <span>
                          Hết hạn:{" "}
                          <span className="font-semibold text-(--c-ink)">
                            {formatDateVN(p.endsAt)}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Dịch vụ & Hồ sơ ── */}
        <TabsContent value="services" className="mt-5">
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
            {/* Bank + completeness */}
            <div className="space-y-4">
              <div className="bg-(--c-card) border border-(--c-line) rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-(--c-muted)">
                    Mức độ hoàn thiện hồ sơ
                  </p>
                  <ShieldCheck
                    className="w-5 h-5 text-(--c-primary-strong)"
                    aria-hidden="true"
                  />
                </div>
                <p className="font-bold mt-1.5 mb-2.5 text-(--c-ink)">
                  {completedDocs} / {DOC_GROUPS.length} mục giấy tờ
                </p>
                <div className="h-2 rounded-full bg-(--c-card-2) overflow-hidden">
                  <div
                    className="h-full bg-(--c-primary) rounded-full transition-all"
                    style={{
                      width: `${(completedDocs / DOC_GROUPS.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div className="bg-(--c-card) border border-(--c-line) rounded-2xl p-5">
                <InfoRow
                  icon={Fingerprint}
                  label="Số CCCD / CMND"
                  value={detail.document?.idNumber || "—"}
                  mono
                />
              </div>
            </div>

            {/* Documents — giấy tờ định danh & pháp lý (xem chi tiết) */}
            <div className="bg-(--c-card) border border-(--c-line) rounded-2xl p-3 sm:p-4">
              <div className="flex items-center justify-between px-2 pt-1.5 pb-2">
                <h3 className="text-sm font-bold flex items-center gap-2 text-(--c-ink)">
                  <ImageIcon
                    className="w-4 h-4 text-(--c-primary-strong)"
                    aria-hidden="true"
                  />
                  Giấy tờ định danh & pháp lý
                </h3>
                <span className="text-xs text-(--c-muted)">
                  Bấm ảnh để xem ảnh gốc
                </span>
              </div>
              <Separator className="mb-3" />
              {isDocsLoading ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="aspect-video rounded-2xl" />
                  ))}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4 items-start">
                  {DOC_GROUPS.map((group) => (
                    <DocGroupCard
                      key={group.id}
                      group={group}
                      docs={getDocsByType(group.id)}
                      onZoom={setLightbox}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-bold mb-4">Dịch vụ & Bài test năng lực</h3>
            <TaskerServicesTab taskerId={detail.id} />
          </div>
        </TabsContent>

        {/* ── Trang bị & Premium ── */}
        <TabsContent value="equipments" className="mt-5 space-y-6">
          <TaskerPremiumReviewPanel tasker={detail} onZoom={setLightbox} />
          
          <div>
            <h3 className="text-lg font-bold mb-4 mt-8">Quản lý Trang bị & Đồng phục</h3>
            <TaskerEquipmentsTab taskerId={detail.id} />
          </div>
        </TabsContent>

        {/* ── Lịch làm việc ── */}
        <TabsContent value="schedule" className="mt-5">
          <TaskerScheduleTab taskerId={detail.id} />
        </TabsContent>

        {/* ── Tài chính & Ví ── */}
        <TabsContent value="finance" className="mt-5 space-y-4">
          <TaskerFinanceTab taskerId={detail.id} />
        </TabsContent>

        {/* ── Đánh giá ── */}
        <TabsContent value="reviews" className="mt-5">
          <TaskerReviewsTab 
            taskerId={detail.id} 
            avgRating={rating} 
            totalJobs={detail.stats?.totalCompletedJobs ?? detail.totalJobs ?? 0} 
          />
        </TabsContent>
      </Tabs>

      {/* Lightbox — xem ảnh giấy tờ / dụng cụ gốc */}
      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="cz-admin max-w-4xl w-[95vw] p-2 bg-black/95 border-none">
          <DialogTitle className="sr-only">Xem ảnh gốc</DialogTitle>
          {lightbox && (
            <img
              src={lightbox}
              alt="Ảnh gốc"
              className="w-full max-h-[85vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
