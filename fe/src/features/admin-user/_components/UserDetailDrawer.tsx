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
import { cn } from "@/lib/utils";
import { useAdminUserDetail } from "../hooks/useAdminUser";
import { UserStatusToggle } from "./UserStatusToggle";
import {
  PROVIDER_LABELS,
  ROLE_BADGE_STYLES,
  ROLE_LABELS,
} from "../constants";
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

const formatDate = (value?: string | null) => {
  if (!value) return "Chưa có";
  return new Date(value).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

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

export const UserDetailDrawer: React.FC<UserDetailDrawerProps> = ({
  userId,
  isOpen,
  onClose,
}) => {
  const { data: user, isLoading } = useAdminUserDetail(userId);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-xl md:max-w-2xl w-full h-full p-0 flex flex-col bg-background rounded-l-[24px] overflow-hidden border-l border-border/40 shadow-2xl">
        <div className="p-6 border-b border-border/40 shrink-0">
          <SheetHeader className="text-left">
            <SheetTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Chi tiết người dùng
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
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
            <User className="w-12 h-12 text-muted-foreground/60 mb-2" />
            <h3 className="font-semibold text-base">Không tìm thấy người dùng</h3>
            <p className="text-sm text-muted-foreground">
              Có lỗi xảy ra hoặc dữ liệu đã bị xóa.
            </p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Profile header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-muted/30 rounded-2xl border border-border/30">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.fullName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      user.fullName?.[0]?.toUpperCase() || "U"
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold leading-none">{user.fullName}</h2>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] py-0 px-1.5 font-bold uppercase rounded-md border",
                          ROLE_BADGE_STYLES[user.role] || "bg-muted text-muted-foreground"
                        )}
                      >
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                      {user.isVerified && (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px] py-0 px-1.5 font-bold uppercase rounded-md"
                        >
                          Đã xác thực
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                <InfoCell icon={Calendar} label="Ngày tham gia" value={formatDate(user.createdAt)} />
                <InfoCell icon={LogIn} label="Đăng nhập cuối" value={formatDate(user.lastLogin)} />
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
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-primary" />
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
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-primary" />
                    Hồ sơ người dọn dẹp
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoCell icon={ShieldCheck} label="Trạng thái" value={user.taskerProfile.status} />
                    <InfoCell
                      icon={ClipboardCheck}
                      label="Xác minh hồ sơ"
                      value={user.taskerProfile.docStatus}
                    />
                    <InfoCell
                      icon={Star}
                      label="Đánh giá trung bình"
                      value={user.taskerProfile.ratingAvg ?? 0}
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
                <div className="text-center p-5 border border-dashed border-border/60 rounded-xl">
                  <p className="text-xs text-muted-foreground">
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
