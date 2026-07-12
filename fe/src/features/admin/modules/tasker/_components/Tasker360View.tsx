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
import { cn } from "@/lib/utils";
import {
  useAdminTaskerDetail,
  useAdminTaskerDocuments,
  useAdminTaskerPenalties,
} from "../hooks/admin-tasker.hooks";
import { TaskerStatusToggle } from "./TaskerStatusToggle";
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
  Award,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Fingerprint,
  FileText,
  Wallet,
  ZoomIn,
  ClipboardList,
  Receipt,
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
} from "lucide-react";

interface Tasker360ViewProps {
  taskerId: string;
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
  { id: "citizenCard", label: "CCCD / CMND (2 mặt)", icon: IdCard, required: true, hint: "Rõ nét, đủ 2 mặt" },
  { id: "idWithSelfie", label: "Ảnh selfie cầm CCCD", icon: ScanFace, required: false, hint: "Nhìn thẳng, rõ mặt" },
  { id: "criminalRecord", label: "Lý lịch tư pháp", icon: Scale, required: false },
  { id: "healthCertificate", label: "Giấy khám sức khoẻ", icon: HeartPulse, required: false },
  { id: "certificate", label: "Chứng chỉ nghề nghiệp", icon: AwardIcon, required: false },
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
  <div className="flex items-center justify-between gap-4 py-2.5 border-b border-[var(--c-line)] last:border-0">
    <span className="flex items-center gap-2 text-sm text-[var(--c-muted)] shrink-0">
      <Icon className="w-4 h-4 text-[var(--c-muted)]" aria-hidden="true" />
      {label}
    </span>
    <span
      className={cn(
        "text-sm font-semibold text-right text-[var(--c-ink)] break-words",
        mono && "font-mono tracking-tight"
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
  tone: "emerald" | "blue" | "amber";
}> = ({ icon: Icon, value, label, tone }) => {
  const tones = {
    emerald: "bg-[rgba(14,159,110,0.12)] text-[#0E9F6E]",
    blue: "bg-[rgba(37,99,235,0.12)] text-[#2563EB]",
    amber: "bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)]",
  };
  return (
    <div className="bg-[var(--c-card)] border border-[var(--c-line)] rounded-2xl p-5 flex items-center gap-4">
      <div
        className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
          tones[tone]
        )}
      >
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black leading-none text-[var(--c-ink)]">{value}</p>
        <p className="text-xs font-medium text-[var(--c-muted)] mt-1.5">{label}</p>
      </div>
    </div>
  );
};

const ComingSoon: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
}> = ({ icon: Icon, title, description }) => (
  <div className="border border-dashed border-[var(--c-line-strong)] rounded-2xl py-16 px-6 flex flex-col items-center text-center gap-3 bg-[var(--c-card-2)]">
    <div className="w-14 h-14 rounded-2xl bg-[var(--c-card-2)] flex items-center justify-center text-[var(--c-muted)]">
      <Icon className="w-7 h-7" aria-hidden="true" />
    </div>
    <div className="flex items-center gap-2">
      <h3 className="font-bold text-base text-[var(--c-ink)]">{title}</h3>
      <Badge
        variant="outline"
        className="text-[10px] font-bold uppercase tracking-wider bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] border-[var(--c-primary)]/20 gap-1"
      >
        <Construction className="w-3 h-3" aria-hidden="true" /> Đang phát triển
      </Badge>
    </div>
    <p className="text-sm text-[var(--c-muted)] max-w-md">{description}</p>
  </div>
);

// ─── Document group card (read-only detail view — không có nút duyệt) ─────────

const DocGroupCard: React.FC<{
  group: DocGroup;
  docs: Array<{ id: string; fileUrl: string }>;
  onZoom: (url: string) => void;
}> = ({ group, docs, onZoom }) => (
  <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-5">
    <div className="mb-3">
      <p className="text-sm font-bold flex items-center gap-2 text-[var(--c-ink)]">
        <group.icon className="w-4 h-4 text-[var(--c-primary-strong)]" aria-hidden="true" /> {group.label}
        {!group.required && (
          <span className="text-[10px] font-normal text-[var(--c-muted)]">(tuỳ chọn)</span>
        )}
      </p>
      <p
        className={cn(
          "text-xs mt-0.5 flex items-center gap-1",
          docs.length > 0
            ? "text-[#0E9F6E]"
            : group.required
            ? "text-[#E11D48]"
            : "text-[var(--c-muted)]"
        )}
      >
        {docs.length > 0 ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Đã nộp {docs.length} ảnh
          </>
        ) : group.required ? (
          <>
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> Chưa nộp
          </>
        ) : (
          <>
            <Minus className="w-3.5 h-3.5" aria-hidden="true" /> Chưa nộp (không bắt buộc)
          </>
        )}
        {group.hint && docs.length > 0 && (
          <span className="text-[var(--c-muted)]"> • {group.hint}</span>
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
            className="group relative aspect-video rounded-xl border border-[var(--c-line)] overflow-hidden bg-[var(--c-card-2)]"
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
      <div className="border border-dashed border-[var(--c-line-strong)] rounded-xl py-8 flex flex-col items-center gap-2 text-center">
        <ImageIcon className="w-8 h-8 text-[var(--c-muted)]/50" aria-hidden="true" />
        <p className="text-xs text-[var(--c-muted)]">Ứng viên chưa tải lên</p>
      </div>
    )}
  </div>
);

// ─── Main view ──────────────────────────────────────────────────────────────

export const Tasker360View: React.FC<Tasker360ViewProps> = ({ taskerId }) => {
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

  const errorStatus = (error as { response?: { status?: number } })?.response?.status;
  const isNotFound = errorStatus === 404;

  // Lỗi thực sự (500/mạng), không phải 404 — cho phép người dùng thử lại.
  if (isError && !isNotFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
        <AlertTriangle className="w-16 h-16 text-[var(--c-muted)]/40" aria-hidden="true" />
        <h2 className="text-xl font-bold text-[var(--c-ink)]">Không tải được dữ liệu đối tác</h2>
        <p className="text-[var(--c-muted)]">
          Đã có lỗi xảy ra khi tải thông tin đối tác. Vui lòng thử lại.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.back()} className="border-[var(--c-line-strong)] bg-[var(--c-card)] text-[var(--c-ink-soft)] hover:text-[var(--c-ink)]">
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" /> Quay lại
          </Button>
          <Button onClick={() => refetch()} className="bg-[var(--c-primary)] text-white hover:bg-[var(--c-primary)]/90">
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
        <User className="w-16 h-16 text-[var(--c-muted)]/40" aria-hidden="true" />
        <h2 className="text-xl font-bold text-[var(--c-ink)]">Không tìm thấy đối tác</h2>
        <p className="text-[var(--c-muted)]">
          Dữ liệu đã bị xóa hoặc ID không hợp lệ.
        </p>
        <Button variant="outline" onClick={() => router.back()} className="border-[var(--c-line-strong)] bg-[var(--c-card)] text-[var(--c-ink-soft)] hover:text-[var(--c-ink)]">
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
    (g) => getDocsByType(g.id).length > 0
  ).length;

  const parsedNotes = parseAdminNotes(detail.adminNotes);
  const penalties = (penaltiesData ?? []) as TaskerPenalty[];

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-semibold text-[var(--c-muted)] hover:text-[var(--c-ink)] transition-colors group"
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
          className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-[var(--c-primary)]/25 blur-2xl"
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

          <div className="flex-1 min-w-[260px]">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {detail.fullName || "Chưa cập nhật"}
              </h1>
              <StatusBadge tone={ACCOUNT_STATUS_TONE[detail.status] ?? "neutral"}>
                {ACCOUNT_STATUS_LABELS[detail.status] || detail.status}
              </StatusBadge>
              <Badge
                variant="outline"
                className="text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white border-white/20 gap-1"
              >
                <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                {DOC_STATUS_LABELS[detail.approvalStatus] || detail.approvalStatus}
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
                className="w-7 h-7 text-[var(--c-primary)] fill-[var(--c-primary)]"
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
            <div onClick={(e) => e.stopPropagation()}>
              <TaskerStatusToggle
                taskerId={detail.id}
                status={detail.status}
                fullName={detail.fullName || "tasker"}
                cancelSuspendedUntil={detail.cancelSuspendedUntil}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <Tabs defaultValue="detail" className="w-full">
        <TabsList className="w-full h-auto flex-wrap justify-start gap-2.5 rounded-none bg-transparent border-0 p-0">
          <TabsTrigger value="detail" className="flex-none h-11 px-4 gap-2 text-sm font-semibold rounded-xl border border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-muted)] transition-colors hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)] data-[state=active]:bg-[var(--c-primary)] data-[state=active]:text-white data-[state=active]:border-[var(--c-primary)] data-[state=active]:shadow-sm data-[state=active]:font-bold">
            <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" /> Chi tiết
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex-none h-11 px-4 gap-2 text-sm font-semibold rounded-xl border border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-muted)] transition-colors hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)] data-[state=active]:bg-[var(--c-primary)] data-[state=active]:text-white data-[state=active]:border-[var(--c-primary)] data-[state=active]:shadow-sm data-[state=active]:font-bold">
            <FileText className="w-3.5 h-3.5" aria-hidden="true" /> Hồ sơ
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-none h-11 px-4 gap-2 text-sm font-semibold rounded-xl border border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-muted)] transition-colors hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)] data-[state=active]:bg-[var(--c-primary)] data-[state=active]:text-white data-[state=active]:border-[var(--c-primary)] data-[state=active]:shadow-sm data-[state=active]:font-bold">
            <Calendar className="w-3.5 h-3.5" aria-hidden="true" /> Lịch sử ca
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex-none h-11 px-4 gap-2 text-sm font-semibold rounded-xl border border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-muted)] transition-colors hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)] data-[state=active]:bg-[var(--c-primary)] data-[state=active]:text-white data-[state=active]:border-[var(--c-primary)] data-[state=active]:shadow-sm data-[state=active]:font-bold">
            <Star className="w-3.5 h-3.5" aria-hidden="true" /> Đánh giá
          </TabsTrigger>
          <TabsTrigger value="payroll" className="flex-none h-11 px-4 gap-2 text-sm font-semibold rounded-xl border border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-muted)] transition-colors hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)] data-[state=active]:bg-[var(--c-primary)] data-[state=active]:text-white data-[state=active]:border-[var(--c-primary)] data-[state=active]:shadow-sm data-[state=active]:font-bold">
            <Wallet className="w-3.5 h-3.5" aria-hidden="true" /> Bảng lương
          </TabsTrigger>
        </TabsList>

        {/* ── Chi tiết ── */}
        <TabsContent value="detail" className="mt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              icon={CheckCircle2}
              tone="emerald"
              value={detail.stats?.totalCompletedJobs ?? detail.totalJobs ?? 0}
              label="Đơn hoàn thành"
            />
            <StatCard
              icon={Clock}
              tone="blue"
              value={`${detail.stats?.totalWorkingHours ?? 0} giờ`}
              label="Tổng giờ làm việc"
            />
            <StatCard
              icon={Award}
              tone="amber"
              value={detail.stats?.totalPoints ?? 0}
              label="Điểm thưởng tích lũy"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-[var(--c-card)] border border-[var(--c-line)] rounded-2xl p-5">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-[var(--c-ink)]">
                <ClipboardList className="w-4 h-4 text-[var(--c-primary-strong)]" aria-hidden="true" />
                Thông tin đối tác
              </h3>
              <div className="px-0.5">
                <InfoRow icon={User} label="Họ và tên" value={detail.fullName || "Chưa cập nhật"} />
                <InfoRow icon={Phone} label="Số điện thoại" value={phone} mono />
                <InfoRow icon={Mail} label="Email" value={email} />
                <InfoRow icon={MapPin} label="Khu vực hoạt động" value={detail.workingAddress || "Chưa cập nhật"} />
                <InfoRow icon={Calendar} label="Ngày tham gia" value={formatDate(detail.createdAt)} />
                <InfoRow icon={Hash} label="Mã đối tác" value={detail.id} mono />
              </div>

              {(detail.docReviewedByName || detail.updatedByName) && (
                <div className="mt-3 space-y-1.5 border-t border-[var(--c-line)] pt-3">
                  {detail.docReviewedByName && (
                    <p className="flex items-center gap-1.5 text-xs text-[var(--c-muted)]">
                      <ShieldCheck
                        className="w-3.5 h-3.5 text-[var(--c-muted)]"
                        aria-hidden="true"
                      />
                      Duyệt hồ sơ bởi:{" "}
                      <span className="font-semibold text-[var(--c-ink-soft)]">
                        {detail.docReviewedByName}
                      </span>
                    </p>
                  )}
                  {detail.updatedByName && (
                    <p className="flex items-center gap-1.5 text-xs text-[var(--c-muted)]">
                      <History
                        className="w-3.5 h-3.5 text-[var(--c-muted)]"
                        aria-hidden="true"
                      />
                      Cập nhật bởi:{" "}
                      <span className="font-semibold text-[var(--c-ink-soft)]">
                        {detail.updatedByName}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="bg-[var(--c-card)] border border-[var(--c-line)] rounded-2xl p-5">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-[var(--c-ink)]">
                <Sparkles className="w-4 h-4 text-[var(--c-primary-strong)]" aria-hidden="true" />
                Kỹ năng & dịch vụ
              </h3>
              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="text-xs font-medium bg-[var(--c-card-2)] text-[var(--c-ink-soft)] rounded-full px-3 py-1.5"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--c-muted)]">Chưa cập nhật kỹ năng.</p>
              )}

              <div className="mt-4 rounded-xl bg-[var(--c-card-2)] p-4">
                <p className="text-xs text-[var(--c-muted)] flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" aria-hidden="true" /> Kinh nghiệm
                </p>
                <p className="text-sm font-semibold mt-1 text-[var(--c-ink)]">
                  {detail.experience || "Chưa cập nhật"}
                </p>
              </div>

              {detail.bio && (
                <p className="mt-3 text-sm text-[var(--c-muted)] leading-relaxed">
                  {detail.bio}
                </p>
              )}
            </div>
          </div>

          {/* Admin notes */}
          {parsedNotes ? (
            <div className="rounded-2xl border border-[rgba(37,99,235,0.3)] bg-[rgba(37,99,235,0.06)] p-5">
              <p className="text-[10px] uppercase font-bold tracking-wider text-[#2563EB] mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" /> Ghi chú của
                admin
              </p>
              {parsedNotes.itemLabels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {parsedNotes.itemLabels.map((label) => (
                    <Badge
                      key={label}
                      variant="outline"
                      className="text-xs bg-[var(--c-card)] border-[var(--c-line)] text-[var(--c-ink-soft)]"
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              )}
              {parsedNotes.note && (
                <p className="text-sm text-[var(--c-ink-soft)] italic leading-relaxed">
                  &ldquo;{parsedNotes.note}&rdquo;
                </p>
              )}
            </div>
          ) : (
            detail.adminNotes && (
              <div className="rounded-2xl border border-[rgba(37,99,235,0.3)] bg-[rgba(37,99,235,0.06)] p-5">
                <p className="text-[10px] uppercase font-bold tracking-wider text-[#2563EB] mb-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" /> Ghi chú của
                  admin
                </p>
                <p className="text-sm text-[var(--c-ink-soft)] whitespace-pre-wrap leading-relaxed">
                  {detail.adminNotes}
                </p>
              </div>
            )
          )}

          {/* Ban reason */}
          {detail.banReason && (
            <div className="rounded-2xl border border-[rgba(225,29,72,0.3)] bg-[rgba(225,29,72,0.06)] p-5">
              <p className="text-[10px] uppercase font-bold tracking-wider text-[#E11D48] mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" /> Lý do khóa
                tài khoản
              </p>
              <p className="text-sm text-[var(--c-ink-soft)] leading-relaxed">
                {detail.banReason}
              </p>
            </div>
          )}

          {/* Penalties */}
          {penalties.length > 0 && (
            <div className="bg-[var(--c-card)] border border-[var(--c-line)] rounded-2xl p-5">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-[var(--c-ink)]">
                <AlertCircle className="w-4 h-4 text-[var(--c-primary-strong)]" aria-hidden="true" />
                Lịch sử kỷ luật
              </h3>
              <div className="space-y-3">
                {penalties.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-[var(--c-line)] p-4 space-y-2 bg-[var(--c-card-2)]"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 uppercase tracking-widest",
                          p.type === "PERMANENT"
                            ? "bg-[rgba(225,29,72,0.12)] text-[#E11D48] border-[rgba(225,29,72,0.3)]"
                            : "bg-[rgba(217,119,6,0.14)] text-[#D97706] border-[rgba(217,119,6,0.3)]"
                        )}
                      >
                        {PENALTY_TYPE_LABELS[p.type] || p.type}
                      </Badge>
                      <span className="text-xs text-[var(--c-muted)]">
                        {formatDateVN(p.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--c-ink)] font-medium leading-relaxed">
                      {p.reason}
                    </p>
                    <div className="text-[11px] text-[var(--c-muted)] flex justify-between gap-2 pt-1 border-t border-[var(--c-line)]">
                      <span>
                        Người xử lý:{" "}
                        <span className="font-semibold text-[var(--c-ink)]">
                          {p.createdBy?.fullName || "Admin"}
                        </span>
                      </span>
                      {p.endsAt && (
                        <span>
                          Hết hạn:{" "}
                          <span className="font-semibold text-[var(--c-ink)]">
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

        {/* ── Hồ sơ ── */}
        <TabsContent value="profile" className="mt-5">
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
            {/* Bank + completeness */}
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl bg-[#0D1B3E] text-white p-5">
                <div
                  className="absolute -right-8 -bottom-10 w-32 h-32 rounded-full bg-[var(--c-primary)]/30 blur-xl"
                  aria-hidden="true"
                />
                <div className="relative flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-white/60">
                    TK nhận lương
                  </span>
                  <span className="font-bold text-sm">
                    {detail.bankName || "Chưa cập nhật"}
                  </span>
                </div>
                <p className="relative font-mono text-lg tracking-widest mt-5">
                  {maskAccount(detail.bankAccountNumber)}
                </p>
                <div className="relative flex items-end justify-between mt-4">
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-white/50">
                      Chủ tài khoản
                    </p>
                    <p className="font-semibold text-sm mt-0.5">
                      {detail.bankAccountName || "Chưa cập nhật"}
                    </p>
                  </div>
                  {detail.bankAccountNumber && (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold bg-[rgba(14,159,110,0.25)] text-white border-[rgba(14,159,110,0.5)] gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Đã có
                    </Badge>
                  )}
                </div>
              </div>

              <div className="bg-[var(--c-card)] border border-[var(--c-line)] rounded-2xl p-5">
                <InfoRow
                  icon={CreditCard}
                  label="Số tài khoản"
                  value={detail.bankAccountNumber || "—"}
                  mono
                />
                <InfoRow
                  icon={Fingerprint}
                  label="Số CCCD / CMND"
                  value={detail.document?.idNumber || "—"}
                  mono
                />
              </div>

              <div className="bg-[var(--c-card)] border border-[var(--c-line)] rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[var(--c-muted)]">Mức độ hoàn thiện hồ sơ</p>
                  <ShieldCheck className="w-5 h-5 text-[var(--c-primary-strong)]" aria-hidden="true" />
                </div>
                <p className="font-bold mt-1.5 mb-2.5 text-[var(--c-ink)]">
                  {completedDocs} / {DOC_GROUPS.length} mục giấy tờ
                </p>
                <div className="h-2 rounded-full bg-[var(--c-card-2)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--c-primary)] rounded-full transition-all"
                    style={{
                      width: `${(completedDocs / DOC_GROUPS.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Documents — giấy tờ định danh & pháp lý (xem chi tiết) */}
            <div className="bg-[var(--c-card)] border border-[var(--c-line)] rounded-2xl p-3 sm:p-4">
              <div className="flex items-center justify-between px-2 pt-1.5 pb-2">
                <h3 className="text-sm font-bold flex items-center gap-2 text-[var(--c-ink)]">
                  <ImageIcon className="w-4 h-4 text-[var(--c-primary-strong)]" aria-hidden="true" />
                  Giấy tờ định danh & pháp lý
                </h3>
                <span className="text-xs text-[var(--c-muted)]">Bấm ảnh để xem ảnh gốc</span>
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
        </TabsContent>

        {/* ── Lịch sử ca ── */}
        <TabsContent value="history" className="mt-5">
          <ComingSoon
            icon={ClipboardList}
            title="Lịch sử ca làm việc"
            description="Danh sách chi tiết các ca đã nhận, doanh thu và đánh giá theo từng đơn sẽ hiển thị tại đây khi API booking của đối tác được kết nối."
          />
        </TabsContent>

        {/* ── Đánh giá ── */}
        <TabsContent value="reviews" className="mt-5">
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
            <div className="bg-[var(--c-card)] border border-[var(--c-line)] rounded-2xl p-6 flex flex-col items-center justify-center text-center">
              <p className="text-5xl font-black leading-none text-[var(--c-ink)]">
                {rating > 0 ? rating.toFixed(1) : "—"}
              </p>
              <div className="flex items-center gap-0.5 mt-2 text-[var(--c-primary)]">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-4 h-4",
                      i < Math.round(rating)
                        ? "fill-[var(--c-primary)] text-[var(--c-primary)]"
                        : "text-[var(--c-muted)]/30"
                    )}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <p className="text-sm text-[var(--c-muted)] mt-2">
                {detail.stats?.totalCompletedJobs ?? detail.totalJobs ?? 0} ca đã hoàn thành
              </p>
            </div>
            <ComingSoon
              icon={Star}
              title="Đánh giá chi tiết từ khách hàng"
              description="Điểm trung bình được tổng hợp từ hệ thống. Danh sách nhận xét, phân bố sao và phản hồi theo từng đơn sẽ hiển thị khi API đánh giá được kết nối."
            />
          </div>
        </TabsContent>

        {/* ── Bảng lương ── */}
        <TabsContent value="payroll" className="mt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard
              icon={Receipt}
              tone="amber"
              value={detail.stats?.totalCompletedJobs ?? detail.totalJobs ?? 0}
              label="Số ca tính lương"
            />
          </div>
          <ComingSoon
            icon={Receipt}
            title="Bảng lương theo kỳ"
            description="Doanh thu gộp, phí nền tảng, thực nhận và phiếu lương từng kỳ sẽ hiển thị tại đây khi module tài chính (finance) được kết nối."
          />
        </TabsContent>
      </Tabs>

      {/* Lightbox — xem ảnh giấy tờ gốc */}
      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="cz-admin max-w-4xl w-[95vw] p-2 bg-black/95 border-none">
          <DialogTitle className="sr-only">Xem ảnh giấy tờ</DialogTitle>
          {lightbox && (
            <img
              src={lightbox}
              alt="Ảnh giấy tờ"
              className="w-full max-h-[85vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
