"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge, AdminAvatar, type BadgeTone } from "@/components/admin";
import { useAdminUserDetail } from "../hooks/useAdminUser";
import { UserStatusToggle } from "./UserStatusToggle";
import {
  PROVIDER_LABELS,
  ROLE_LABELS,
} from "../constants";
import {
  ACCOUNT_STATUS_LABELS,
  DOC_STATUS_LABELS,
} from "@/features/admin/modules/tasker/constants";
import { formatUserDateTime } from "../user.helpers";

/** Nhãn tiếng Việt cho trạng thái tài khoản tasker (key viết hoa, ví dụ "ACTIVE"). */
const taskerStatusLabel = (status?: string | null): string =>
  status ? ACCOUNT_STATUS_LABELS[status] ?? status : "—";

/** Nhãn tiếng Việt cho trạng thái hồ sơ tasker; map dùng key viết thường nên chuẩn hóa. */
const docStatusLabel = (status?: string | null): string =>
  status ? DOC_STATUS_LABELS[status.toLowerCase()] ?? status : "—";

/** Định dạng điểm đánh giá trung bình (giá trị có thể là chuỗi numeric từ DB). */
const formatRating = (value?: number | string | null): string =>
  Number(value ?? 0).toFixed(1);

/** Vai trò → tông màu pill (ADMIN tím · CUSTOMER xanh · TASKER vàng). */
const ROLE_TONE: Record<string, BadgeTone> = {
  ADMIN: "purple",
  CUSTOMER: "info",
  TASKER: "warning",
};
import {
  User,
  Mail,
  Phone,
  Calendar,
  LogIn,
  ShieldCheck,
  Briefcase,
  Star,
  ClipboardCheck,
  Sparkles,
  Fingerprint,
} from "lucide-react";

interface UserDetailDrawerProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

const InfoCell: React.FC<{
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}> = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 p-3.5 bg-[var(--c-card-2)] rounded-xl border border-[var(--c-line)]">
    <div className="w-8 h-8 rounded-lg bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] text-[var(--c-muted)] font-semibold uppercase tracking-wider">
        {label}
      </p>
      <p className="text-xs font-semibold text-[var(--c-ink-soft)] mt-0.5 truncate">{value}</p>
    </div>
  </div>
);

export const UserDetailDrawer: React.FC<UserDetailDrawerProps> = ({
  userId,
  isOpen,
  onClose,
}) => {
  const { data: user, isLoading } = useAdminUserDetail(userId);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="cz-admin sm:max-w-xl md:max-w-2xl w-full h-full p-0 flex flex-col bg-[var(--c-card)] text-[var(--c-ink)] rounded-l-[24px] overflow-hidden border-l border-[var(--c-line)] shadow-2xl">
        <div className="p-6 border-b border-[var(--c-line)] shrink-0">
          <SheetHeader className="text-left">
            <SheetTitle className="text-lg font-bold text-[var(--c-ink)] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--c-primary-strong)]" />
              Chi tiết người dùng
            </SheetTitle>
            <SheetDescription className="text-xs text-[var(--c-muted)]">
              Thông tin tài khoản và hồ sơ liên kết theo vai trò.
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
        ) : !user ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <User className="w-12 h-12 text-[var(--c-muted)] mb-2" />
            <h3 className="font-semibold text-base text-[var(--c-ink)]">Không tìm thấy người dùng</h3>
            <p className="text-sm text-[var(--c-muted)]">
              Có lỗi xảy ra hoặc dữ liệu đã bị xóa.
            </p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Profile header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-[var(--c-card-2)] rounded-2xl border border-[var(--c-line)]">
                <div className="flex items-center gap-4">
                  <AdminAvatar
                    src={user.avatarUrl}
                    name={user.fullName}
                    initials={user.fullName?.[0]?.toUpperCase() || "U"}
                    size="xl"
                  />
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold leading-none text-[var(--c-ink)]">{user.fullName}</h2>
                      <StatusBadge tone={ROLE_TONE[user.role] ?? "neutral"} className="uppercase">
                        {ROLE_LABELS[user.role] || user.role}
                      </StatusBadge>
                      {user.isVerified && (
                        <StatusBadge tone="success" className="uppercase">
                          Đã xác thực
                        </StatusBadge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--c-muted)]">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2 text-xs text-[var(--c-muted)]">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="shrink-0 pt-2 sm:pt-0">
                  <UserStatusToggle
                    userId={user.id}
                    isActive={user.isActive}
                    fullName={user.fullName}
                  />
                </div>
              </div>

              {/* Account details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <InfoCell icon={Calendar} label="Ngày tham gia" value={formatUserDateTime(user.createdAt)} />
                <InfoCell icon={LogIn} label="Đăng nhập cuối" value={formatUserDateTime(user.lastLogin)} />
                <InfoCell
                  icon={ShieldCheck}
                  label="Phương thức đăng nhập"
                  value={PROVIDER_LABELS[user.provider] || user.provider}
                />
                <InfoCell icon={Fingerprint} label="Mã người dùng" value={user.id.slice(0, 8)} />
              </div>

              {/* Linked customer profile */}
              {user.customerProfile && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-[var(--c-ink)] flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-[var(--c-primary-strong)]" />
                    Hồ sơ khách hàng
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoCell
                      icon={Briefcase}
                      label="Tổng đơn đặt"
                      value={user.customerProfile.totalBookings}
                    />
                    <InfoCell
                      icon={ClipboardCheck}
                      label="Đơn đã hủy"
                      value={user.customerProfile.totalCancelled}
                    />
                  </div>
                </div>
              )}

              {/* Linked tasker profile */}
              {user.taskerProfile && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-[var(--c-ink)] flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-[var(--c-primary-strong)]" />
                    Hồ sơ người dọn dẹp
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoCell
                      icon={ShieldCheck}
                      label="Trạng thái"
                      value={taskerStatusLabel(user.taskerProfile.status)}
                    />
                    <InfoCell
                      icon={ClipboardCheck}
                      label="Xác minh hồ sơ"
                      value={docStatusLabel(user.taskerProfile.docStatus)}
                    />
                    <InfoCell
                      icon={Star}
                      label="Đánh giá trung bình"
                      value={formatRating(user.taskerProfile.ratingAvg)}
                    />
                    <InfoCell
                      icon={Briefcase}
                      label="Đơn hoàn thành"
                      value={user.taskerProfile.totalCompletedJobs}
                    />
                  </div>
                </div>
              )}

              {!user.customerProfile && !user.taskerProfile && (
                <div className="text-center p-5 border border-dashed border-[var(--c-line-strong)] rounded-xl">
                  <p className="text-xs text-[var(--c-muted)]">
                    Người dùng này không có hồ sơ khách hàng hoặc người dọn dẹp liên kết.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
};
