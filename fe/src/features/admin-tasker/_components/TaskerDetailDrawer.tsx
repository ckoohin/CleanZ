"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAdminTaskerDetail } from "../hooks/admin-tasker.hooks";
import { TaskerStatusToggle } from "./TaskerStatusToggle";
import {
  DOC_STATUS_BADGE_STYLES,
  DOC_STATUS_LABELS,
} from "../constants";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  CreditCard,
  Star,
  Briefcase,
  Wallet,
  Award,
  Clock,
  Sparkles,
  Fingerprint,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface TaskerDetailDrawerProps {
  taskerId: string;
  isOpen: boolean;
  onClose: () => void;
}

const formatDate = (value?: string | null) => {
  if (!value) return "Chưa có";
  return new Date(value).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatCurrency = (value?: number | null) =>
  `${(value ?? 0).toLocaleString("vi-VN")} đ`;

const InfoCell: React.FC<{
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}> = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 p-3.5 bg-background rounded-xl border border-border/30">
    <div className="w-8 h-8 rounded-lg bg-primary/5 text-primary flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
        {label}
      </p>
      <p className="text-xs font-semibold text-foreground/80 mt-0.5 truncate">{value}</p>
    </div>
  </div>
);

const DocRow: React.FC<{ done: boolean; label: string }> = ({ done, label }) => (
  <div
    className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm",
      done
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
        : "border-border bg-muted/50 text-muted-foreground"
    )}
  >
    {done ? (
      <CheckCircle2 className="w-4 h-4 shrink-0" />
    ) : (
      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
    )}
    {label}
  </div>
);

export const TaskerDetailDrawer: React.FC<TaskerDetailDrawerProps> = ({
  taskerId,
  isOpen,
  onClose,
}) => {
  const { data: tasker, isLoading } = useAdminTaskerDetail(taskerId);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-xl md:max-w-2xl w-full h-full p-0 flex flex-col bg-background rounded-l-[24px] overflow-hidden border-l border-border/40 shadow-2xl">
        <div className="p-6 border-b border-border/40 shrink-0">
          <SheetHeader className="text-left">
            <SheetTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Chi tiết đối tác (Tasker)
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Hồ sơ, giấy tờ định danh và hiệu suất hoạt động.
            </SheetDescription>
          </SheetHeader>
        </div>

        {isLoading ? (
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          </div>
        ) : !tasker ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <User className="w-12 h-12 text-muted-foreground/60 mb-2" />
            <h3 className="font-semibold text-base">Không tìm thấy tasker</h3>
            <p className="text-sm text-muted-foreground">
              Có lỗi xảy ra hoặc dữ liệu đã bị xóa.
            </p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-muted/30 rounded-2xl border border-border/30">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                    {tasker.avatarUrl ? (
                      <img
                        src={tasker.avatarUrl}
                        alt={tasker.fullName ?? ""}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      tasker.fullName?.[0]?.toUpperCase() || "T"
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold leading-none">
                        {tasker.fullName || "Chưa cập nhật"}
                      </h2>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] py-0 px-1.5 font-bold uppercase rounded-md border",
                          DOC_STATUS_BADGE_STYLES[tasker.approvalStatus] ||
                            "bg-muted text-muted-foreground"
                        )}
                      >
                        {DOC_STATUS_LABELS[tasker.approvalStatus] || tasker.approvalStatus}
                      </Badge>
                      <span className="text-amber-500 font-bold text-xs flex items-center">
                        ★ {tasker.avgRating > 0 ? tasker.avgRating.toFixed(1) : "N/A"}
                      </span>
                    </div>
                    {tasker.user?.email && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{tasker.user.email}</span>
                      </div>
                    )}
                    {tasker.phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{tasker.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="shrink-0 pt-2 sm:pt-0">
                  <TaskerStatusToggle
                    taskerId={tasker.id}
                    status={tasker.status}
                    fullName={tasker.fullName || "tasker"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <InfoCell icon={Wallet} label="Số dư cọc" value={formatCurrency(tasker.stats.currentDepositBalance)} />
                <InfoCell icon={CreditCard} label="Tiền cọc" value={formatCurrency(tasker.stats.depositAmount)} />
                <InfoCell icon={Briefcase} label="Đơn hoàn thành" value={tasker.stats.totalCompletedJobs} />
                <InfoCell icon={Clock} label="Tổng giờ làm" value={`${tasker.stats.totalWorkingHours} giờ`} />
                <InfoCell icon={Star} label="Đánh giá" value={tasker.stats.ratingAvg.toFixed(1)} />
                <InfoCell icon={Award} label="Điểm thưởng" value={tasker.stats.totalPoints} />
                <InfoCell icon={MapPin} label="Khu vực làm việc" value={tasker.workingAddress || "Chưa cập nhật"} />
                <InfoCell icon={Calendar} label="Ngày tham gia" value={formatDate(tasker.createdAt)} />
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <User className="w-4 h-4 text-primary" />
                  Giới thiệu
                </h3>
                <p className="text-sm text-muted-foreground">
                  {tasker.bio || "Chưa cập nhật"}
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-primary" />
                  Thông tin ngân hàng
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <InfoCell icon={CreditCard} label="Ngân hàng" value={tasker.bankName || "—"} />
                  <InfoCell icon={Fingerprint} label="Số tài khoản" value={tasker.bankAccountNumber || "—"} />
                  <InfoCell icon={User} label="Chủ tài khoản" value={tasker.bankAccountName || "—"} />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Fingerprint className="w-4 h-4 text-primary" />
                  Giấy tờ định danh
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <InfoCell icon={Fingerprint} label="Số CCCD / CMND" value={tasker.document.idNumber || "—"} />
                  <InfoCell icon={Calendar} label="Ngày cấp" value={formatDate(tasker.document.issuedDate)} />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <DocRow done={tasker.hasCitizenCardImage} label="Ảnh CCCD (mặt trước & sau)" />
                  <DocRow done={tasker.hasIdWithSelfieImage} label="Selfie cùng CCCD" />
                  <DocRow done={tasker.hasCriminalRecordImage} label="Lý lịch tư pháp" />
                  <DocRow done={tasker.hasHealthCertificateImage} label="Giấy khám sức khỏe" />
                  <DocRow done={tasker.hasCertificateImage} label="Chứng chỉ nghề" />
                </div>
              </div>

              {tasker.adminNotes && (
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-amber-600 mb-1">
                    Ghi chú của admin
                  </p>
                  <p className="text-sm text-foreground/80">{tasker.adminNotes}</p>
                </div>
              )}

              {tasker.banReason && (
                <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-red-600 mb-1">
                    Lý do khóa
                  </p>
                  <p className="text-sm text-foreground/80">{tasker.banReason}</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
};
