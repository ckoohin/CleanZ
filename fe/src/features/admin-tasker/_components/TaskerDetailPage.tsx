"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  useAdminTaskerDetail,
  useAdminTaskerPenalties,
} from "../hooks/admin-tasker.hooks";
import { TaskerStatusToggle } from "./TaskerStatusToggle";
import { parseAdminNotes } from "./AdminRequestInfoModal";
import {
  ACCOUNT_STATUS_BADGE_STYLES,
  ACCOUNT_STATUS_LABELS,
  DOC_STATUS_BADGE_STYLES,
  DOC_STATUS_LABELS,
} from "../constants";
import type { AdminTaskerDetail } from "../types/admin-tasker.types";
import {
  ArrowLeft,
  Maximize2,
  Mail,
  Phone,
  Calendar,
  MapPin,
  CreditCard,
  Fingerprint,
  Star,
  Briefcase,
  Clock,
  Award,
  Wallet,
  CheckCircle2,
  ShieldCheck,
  FileText,
  ZoomIn,
  ExternalLink,
  Sparkles,
  AlertCircle,
  Wifi,
  User,
} from "lucide-react";

interface TaskerDetailPageProps {
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

// ─── Helpers ──────────────────────────────────────────────────────────────

const formatDate = (value?: string | null) => {
  if (!value) return "Chưa cập nhật";
  return new Date(value).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatVND = (value?: number | null) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value ?? 0
  );

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

const PENALTY_TYPE_LABELS: Record<string, string> = {
  DAYS_2: "Khóa 2 ngày",
  DAYS_7: "Khóa 7 ngày",
  TEMPORARY: "Đình chỉ tạm thời",
  PERMANENT: "Khóa vĩnh viễn",
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const InfoRow: React.FC<{
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}> = ({ icon: Icon, label, value, mono }) => (
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
        {label}
      </p>
      <p
        className={cn(
          "text-xs font-semibold text-foreground/90 mt-0.5 break-words",
          mono && "font-mono tracking-tight"
        )}
      >
        {value}
      </p>
    </div>
  </div>
);

const StatCard: React.FC<{
  icon: React.ElementType;
  value: React.ReactNode;
  label: string;
  tone: "emerald" | "blue" | "amber";
}> = ({ icon: Icon, value, label, tone }) => {
  const tones = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    amber: "bg-primary/10 text-primary",
  };
  return (
    <div className="bg-background border border-border/40 rounded-xl p-4 flex items-center gap-3">
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          tones[tone]
        )}
      >
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-base font-black leading-none text-foreground truncate">
          {value}
        </p>
        <p className="text-[11px] font-medium text-muted-foreground mt-1">
          {label}
        </p>
      </div>
    </div>
  );
};

interface DocEntry {
  label: string;
  sub: string;
  url: string | null;
  has: boolean;
}

const DocStatusBadge: React.FC<{ has: boolean }> = ({ has }) =>
  has ? (
    <Badge
      variant="outline"
      className="text-[9px] font-bold shrink-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
    >
      Đã nộp
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="text-[9px] font-bold shrink-0 bg-muted text-muted-foreground border-border"
    >
      Chưa nộp
    </Badge>
  );

// Submission state is keyed on the dedicated `has` flag (matches Tasker360View);
// `url` only controls whether an image preview is available.
const DocCard: React.FC<{ doc: DocEntry }> = ({ doc }) => {
  const media = doc.url ? (
    <a
      href={doc.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block aspect-video bg-muted"
    >
      <img
        src={doc.url}
        alt={doc.label}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
        <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-white/90 text-gray-900 rounded-full px-3 py-1.5 text-xs font-semibold shadow">
          <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" /> Xem ảnh gốc
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
        </span>
      </div>
    </a>
  ) : (
    <div
      className={cn(
        "aspect-video flex items-center justify-center",
        doc.has ? "bg-muted" : "bg-muted/30 border-b border-dashed border-border/60"
      )}
    >
      <FileText
        className={cn(
          "w-5 h-5",
          doc.has ? "text-muted-foreground" : "text-muted-foreground/40"
        )}
        aria-hidden="true"
      />
    </div>
  );

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden bg-background">
      {media}
      <div className="p-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground/90 truncate">
            {doc.label}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">{doc.sub}</p>
        </div>
        <DocStatusBadge has={doc.has} />
      </div>
    </div>
  );
};

const SectionCard: React.FC<{
  icon: React.ElementType;
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ icon: Icon, title, children, className }) => (
  <div
    className={cn(
      "bg-card border border-border/50 rounded-2xl p-5 space-y-4",
      className
    )}
  >
    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
      <Icon className="w-4 h-4 text-primary" aria-hidden="true" /> {title}
    </h3>
    {children}
  </div>
);

// ─── Main page ──────────────────────────────────────────────────────────────

export const TaskerDetailPage: React.FC<TaskerDetailPageProps> = ({
  taskerId,
}) => {
  const router = useRouter();
  const { data: tasker, isLoading } = useAdminTaskerDetail(taskerId);
  const { data: penaltiesData } = useAdminTaskerPenalties(taskerId);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!tasker) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <User className="w-16 h-16 text-muted-foreground/40" aria-hidden="true" />
        <h2 className="text-xl font-bold">Không tìm thấy đối tác</h2>
        <p className="text-muted-foreground">
          Dữ liệu đã bị xóa hoặc ID không hợp lệ.
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" /> Quay lại
        </Button>
      </div>
    );
  }

  const detail = tasker as AdminTaskerDetail;
  const email = detail.user?.email ?? "Chưa cập nhật";
  const phone = detail.phone ?? detail.user?.phone ?? "Chưa cập nhật";
  const rating = detail.stats?.ratingAvg || detail.avgRating || 0;
  const isOnline = (detail.presenceStatus ?? "").toLowerCase() === "online";

  const skills = (detail.skills ?? "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const docStatus = (detail.document?.status || "").toLowerCase();
  const docEntries: DocEntry[] = [
    {
      label: "CCCD mặt trước",
      sub: detail.document?.idNumber || "Căn cước công dân",
      url: detail.document?.frontUrl ?? null,
      has: !!detail.hasCitizenCardImage,
    },
    {
      label: "CCCD mặt sau",
      sub: "Căn cước công dân",
      url: detail.document?.backUrl ?? null,
      has: !!detail.hasCitizenCardImage,
    },
    {
      label: "Selfie cùng CCCD",
      sub: "Ảnh xác thực danh tính",
      url: detail.avatarUrl,
      has: !!detail.hasIdWithSelfieImage,
    },
    {
      label: "Lý lịch tư pháp",
      sub: "Phiếu lý lịch tư pháp",
      url: detail.document?.criminalRecordUrl ?? null,
      has: !!detail.hasCriminalRecordImage,
    },
    {
      label: "Giấy khám sức khỏe",
      sub: "Còn hiệu lực 12 tháng",
      url: detail.document?.healthCertificateUrl ?? null,
      has: !!detail.hasHealthCertificateImage,
    },
    {
      label: "Chứng chỉ nghề",
      sub: "Chứng chỉ kỹ năng",
      url: detail.document?.certificateUrl ?? null,
      has: !!detail.hasCertificateImage,
    },
  ];
  const submittedDocs = docEntries.filter((d) => d.has).length;

  const parsedNotes = parseAdminNotes(detail.adminNotes);
  const penalties = (penaltiesData ?? []) as TaskerPenalty[];

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ArrowLeft
          className="w-4 h-4 group-hover:-translate-x-1 transition-transform"
          aria-hidden="true"
        />
        Quay lại danh sách Tasker
      </button>

      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-card border border-border/50 rounded-2xl p-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl shrink-0 border border-primary/20 overflow-hidden">
            {detail.avatarUrl ? (
              <img
                src={detail.avatarUrl}
                alt={detail.fullName ?? ""}
                className="w-full h-full rounded-2xl object-cover"
              />
            ) : (
              initialsOf(detail.fullName)
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-foreground">
                {detail.fullName || "Chưa cập nhật"}
              </h1>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-bold uppercase rounded-md border px-2 py-0.5",
                  ACCOUNT_STATUS_BADGE_STYLES[detail.status] ||
                    "bg-muted text-muted-foreground"
                )}
              >
                {ACCOUNT_STATUS_LABELS[detail.status] || detail.status}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-bold uppercase rounded-md border px-2 py-0.5 gap-1",
                  DOC_STATUS_BADGE_STYLES[detail.approvalStatus] ||
                    "bg-muted text-muted-foreground"
                )}
              >
                <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                {DOC_STATUS_LABELS[detail.approvalStatus] || detail.approvalStatus}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
              <span className="flex items-center gap-1">
                <Star
                  className="w-3.5 h-3.5 text-amber-500 fill-amber-500"
                  aria-hidden="true"
                />
                <span className="font-semibold text-foreground/80">
                  {rating > 0 ? rating.toFixed(1) : "Chưa có đánh giá"}
                </span>
              </span>
              <span aria-hidden="true">•</span>
              <span className="flex items-center gap-1">
                <Wifi
                  className={cn(
                    "w-3.5 h-3.5",
                    isOnline ? "text-emerald-500" : "text-muted-foreground/50"
                  )}
                  aria-hidden="true"
                />
                {isOnline ? "Đang online" : "Ngoại tuyến"}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            className="rounded-full gap-2"
            onClick={() => router.push(`/admin/taskers/${detail.id}/360`)}
          >
            <Maximize2 className="w-4 h-4" aria-hidden="true" /> Xem hồ sơ 360°
          </Button>
          <TaskerStatusToggle
            taskerId={detail.id}
            status={detail.status}
            fullName={detail.fullName || "tasker"}
          />
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-4">
          <SectionCard icon={User} title="Thông tin liên hệ">
            <div className="space-y-3">
              <InfoRow icon={Mail} label="Email" value={email} />
              <InfoRow icon={Phone} label="Số điện thoại" value={phone} mono />
              <InfoRow
                icon={MapPin}
                label="Khu vực hoạt động"
                value={detail.workingAddress || "Chưa cập nhật"}
              />
              <InfoRow
                icon={Calendar}
                label="Ngày tham gia"
                value={formatDate(detail.createdAt)}
              />
            </div>
          </SectionCard>

          <SectionCard icon={CreditCard} title="Thông tin ngân hàng">
            <div className="space-y-3">
              <InfoRow
                icon={CreditCard}
                label="Ngân hàng"
                value={detail.bankName || "Chưa cập nhật"}
              />
              <InfoRow
                icon={Fingerprint}
                label="Số tài khoản"
                value={detail.bankAccountNumber || "Chưa cập nhật"}
                mono
              />
              <InfoRow
                icon={User}
                label="Chủ tài khoản"
                value={detail.bankAccountName || "Chưa cập nhật"}
              />
            </div>
          </SectionCard>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stats */}
          <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" /> Hiệu
              suất hoạt động
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                label="Tổng giờ làm"
              />
              <StatCard
                icon={Star}
                tone="amber"
                value={rating > 0 ? rating.toFixed(1) : "—"}
                label="Đánh giá TB"
              />
              <StatCard
                icon={Award}
                tone="amber"
                value={detail.stats?.totalPoints ?? 0}
                label="Điểm thưởng"
              />
              <StatCard
                icon={Wallet}
                tone="emerald"
                value={formatVND(detail.stats?.currentDepositBalance)}
                label="Số dư cọc"
              />
              <StatCard
                icon={CreditCard}
                tone="blue"
                value={formatVND(detail.stats?.depositAmount)}
                label="Tiền cọc đã nộp"
              />
            </div>
          </div>

          {/* Skills & experience */}
          <SectionCard icon={Briefcase} title="Kỹ năng & kinh nghiệm">
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="text-xs font-medium bg-muted text-foreground/80 rounded-full px-3 py-1.5"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Chưa cập nhật kỹ năng.
              </p>
            )}

            <div className="rounded-xl bg-muted/40 p-4">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Kinh nghiệm
              </p>
              <p className="text-sm font-semibold mt-1">
                {detail.experience || "Chưa cập nhật"}
              </p>
            </div>

            {detail.bio && (
              <>
                <Separator />
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">
                    Giới thiệu
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {detail.bio}
                  </p>
                </div>
              </>
            )}
          </SectionCard>

          {/* Documents */}
          <SectionCard
            icon={FileText}
            title={
              <span className="flex items-center gap-2">
                Giấy tờ định danh
                <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {submittedDocs}/{docEntries.length}
                </span>
              </span>
            }
          >
            <div className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-4 text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Fingerprint className="w-3.5 h-3.5" aria-hidden="true" />
                  CCCD: {detail.document?.idNumber || "—"}
                </span>
                <span className="hidden sm:flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                  Cấp: {formatDate(detail.document?.issuedDate)}
                </span>
              </div>
              {detail.document?.status && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-bold shrink-0",
                    DOC_STATUS_BADGE_STYLES[docStatus] ||
                      "bg-muted text-muted-foreground border-border"
                  )}
                >
                  {DOC_STATUS_LABELS[docStatus] || detail.document.status}
                </Badge>
              )}
            </div>

            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{
                  width: `${(submittedDocs / docEntries.length) * 100}%`,
                }}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {docEntries.map((doc) => (
                <DocCard key={doc.label} doc={doc} />
              ))}
            </div>
          </SectionCard>

          {/* Admin notes */}
          {parsedNotes ? (
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5">
              <p className="text-[10px] uppercase font-bold tracking-wider text-blue-600 mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" /> Ghi chú của
                admin
              </p>
              {parsedNotes.itemLabels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {parsedNotes.itemLabels.map((label) => (
                    <Badge
                      key={label}
                      variant="outline"
                      className="text-xs bg-white/60 dark:bg-white/10"
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              )}
              {parsedNotes.note && (
                <p className="text-sm text-foreground/80 italic leading-relaxed">
                  &ldquo;{parsedNotes.note}&rdquo;
                </p>
              )}
            </div>
          ) : (
            detail.adminNotes && (
              <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5">
                <p className="text-[10px] uppercase font-bold tracking-wider text-blue-600 mb-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" /> Ghi chú của
                  admin
                </p>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                  {detail.adminNotes}
                </p>
              </div>
            )
          )}

          {/* Ban reason */}
          {detail.banReason && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
              <p className="text-[10px] uppercase font-bold tracking-wider text-red-600 mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" /> Lý do khóa
                tài khoản
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {detail.banReason}
              </p>
            </div>
          )}

          {/* Penalties */}
          {penalties.length > 0 && (
            <SectionCard icon={AlertCircle} title="Lịch sử kỷ luật">
              <div className="space-y-3">
                {penalties.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-border/50 p-4 space-y-2 bg-background"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 uppercase tracking-widest",
                          p.type === "PERMANENT"
                            ? "bg-red-500/10 text-red-700 border-red-500/30"
                            : "bg-amber-500/10 text-amber-700 border-amber-500/30"
                        )}
                      >
                        {PENALTY_TYPE_LABELS[p.type] || p.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                    <p className="text-sm text-foreground font-medium leading-relaxed">
                      {p.reason}
                    </p>
                    <div className="text-[11px] text-muted-foreground flex justify-between gap-2 pt-1 border-t border-border/50">
                      <span>
                        Người xử lý:{" "}
                        <span className="font-semibold text-foreground">
                          {p.createdBy?.fullName || "Admin"}
                        </span>
                      </span>
                      {p.endsAt && (
                        <span>
                          Hết hạn:{" "}
                          <span className="font-semibold text-foreground">
                            {new Date(p.endsAt).toLocaleDateString("vi-VN")}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
};
