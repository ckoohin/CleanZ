"use client";

import Link from "next/link";
import type { ElementType, ReactNode } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  ChevronRight,
  FileBadge2,
  Headphones,
  LogOut,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Star,
  UserRoundPen,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLogout } from "@/features/auth/hooks/auth.hooks";
import {
  TaskerStatus,
  type TaskerProfile,
} from "@/features/tasker/types/tasker.type";
import type { ReviewPart } from "@/lib/kyc/review-notes";
import { TaskerStatusBanner } from "@/features/tasker/_components/TaskerStatusBanner";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface AccountMenuItemProps {
  title: string;
  description: string;
  icon: ElementType;
  href?: string;
  onClick?: () => void;
  badge?: string;
  destructive?: boolean;
}

function AccountMenuItem({
  title,
  description,
  icon: Icon,
  href,
  onClick,
  badge,
  destructive = false,
}: AccountMenuItemProps) {
  const content = (
    <>
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl",
          destructive
            ? "bg-destructive/10 text-destructive"
            : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-sm font-bold",
            destructive ? "text-destructive" : "text-foreground",
          )}
        >
          {title}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {badge && (
          <span className="max-w-28 truncate rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
            {badge}
          </span>
        )}
        {!destructive && (
          <ChevronRight className="size-4 text-muted-foreground/60" />
        )}
      </span>
    </>
  );
  const className =
    "flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted";

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function AccountSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </h2>
      <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        {children}
      </div>
    </section>
  );
}

export function TaskerAccountOverview({
  tasker,
  reviewParts,
  onEdit,
}: {
  tasker?: TaskerProfile | null;
  reviewParts: ReviewPart[];
  onEdit: () => void;
}) {
  const logout = useLogout();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const initials = tasker?.fullName
    ? tasker.fullName
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "CZ";
  const approval = tasker?.approvalStatus;
  const approvalConfig =
    approval === TaskerStatus.APPROVED
      ? {
          label: "Hồ sơ đã xác minh",
          className: "bg-emerald-500/10 text-emerald-700",
        }
      : approval === TaskerStatus.PENDING
        ? {
            label: "Đang chờ duyệt",
            className: "bg-amber-500/10 text-amber-700",
          }
        : {
            label: "Cần bổ sung hồ sơ",
            className: "bg-destructive/10 text-destructive",
          };
  const checklist = [
    tasker?.phone,
    tasker?.bio,
    tasker?.experience,
    tasker?.addressCurrent,
    tasker?.bankName,
    tasker?.bankAccountNumber,
    tasker?.hasCitizenCardImage,
    tasker?.hasIdWithSelfieImage,
    tasker?.hasCriminalRecordImage,
    tasker?.hasHealthCertificateImage,
  ];
  const completion =
    approval === TaskerStatus.APPROVED
      ? 100
      : Math.round((checklist.filter(Boolean).length / checklist.length) * 100);

  return (
    <>
      <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-5 pb-32 md:px-6 md:py-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Tài khoản
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý hồ sơ và các tiện ích dành cho đối tác CleanZ.
          </p>
        </div>

        <section className="overflow-hidden rounded-[28px] border border-primary/15 bg-card shadow-sm">
          <div className="relative bg-gradient-to-br from-primary/15 via-primary/5 to-card px-5 pb-5 pt-6">
            <div className="absolute -right-10 -top-12 size-36 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative flex items-center gap-4">
              <Avatar className="size-20 shrink-0 border-4 border-card shadow-lg">
                <AvatarImage src={tasker?.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-primary text-xl font-black text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xl font-black text-foreground">
                  {tasker?.fullName ?? "Đối tác CleanZ"}
                </p>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {tasker?.phone ?? "Chưa cập nhật số điện thoại"}
                </p>
                <span
                  className={cn(
                    "mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide",
                    approvalConfig.className,
                  )}
                >
                  <BadgeCheck className="size-3.5" />
                  {approvalConfig.label}
                </span>
              </div>
              <button
                type="button"
                onClick={onEdit}
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card text-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-primary"
                aria-label="Chỉnh sửa thông tin cá nhân"
              >
                <UserRoundPen className="size-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-border/60 border-t border-border/60">
            <Link
              href="/tasker/reviews"
              className="flex min-h-20 items-center justify-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
            >
              <Star className="size-5 fill-amber-400 text-amber-400" />
              <span>
                <span className="block text-lg font-black">
                  {Number(tasker?.avgRating ?? 0) > 0
                    ? Number(tasker?.avgRating).toFixed(1)
                    : "—"}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  Điểm đánh giá
                </span>
              </span>
            </Link>
            <Link
              href="/tasker/earnings"
              className="flex min-h-20 items-center justify-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
            >
              <BriefcaseBusiness className="size-5 text-primary" />
              <span>
                <span className="block text-lg font-black">
                  {tasker?.totalJobs ?? 0}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  Đơn hoàn tất
                </span>
              </span>
            </Link>
          </div>
        </section>

        {/* Trạng thái xét duyệt hồ sơ — chỉ hiển thị ở trang Hồ sơ, không ở trang chủ */}
        <TaskerStatusBanner
          status={tasker?.approvalStatus}
          adminNotes={tasker?.adminNotes}
        />

        {approval !== TaskerStatus.APPROVED && (
          <section
            className={cn(
              "rounded-2xl border p-4",
              reviewParts.length
                ? "border-destructive/20 bg-destructive/5"
                : "border-amber-500/20 bg-amber-500/5",
            )}
          >
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card">
                <FileBadge2
                  className={cn(
                    "size-5",
                    reviewParts.length ? "text-destructive" : "text-amber-600",
                  )}
                />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold">Hoàn thiện hồ sơ đối tác</p>
                  <span className="text-xs font-black text-primary">
                    {completion}%
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-card">
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${completion}%` }}
                  />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {reviewParts.length
                    ? `Quản trị viên yêu cầu bổ sung ${reviewParts.length} nội dung trong hồ sơ.`
                    : "Hồ sơ đang được kiểm tra. Bạn có thể rà lại thông tin đã gửi."}
                </p>
                <Link
                  href="/tasker/onboarding"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-black text-primary"
                >
                  Kiểm tra hồ sơ <ChevronRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </section>
        )}

        <AccountSection title="Tài khoản của tôi">
          <AccountMenuItem
            title="Thông tin cá nhân"
            description="Số điện thoại, địa chỉ, kỹ năng và ngân hàng"
            icon={UserRoundPen}
            onClick={onEdit}
          />
          <AccountMenuItem
            title="Hồ sơ và giấy tờ"
            description="Giấy tờ định danh và trạng thái xét duyệt"
            icon={FileBadge2}
            href="/tasker/profile/documents"
            badge={
              reviewParts.length
                ? `${reviewParts.length} cần bổ sung`
                : undefined
            }
          />
          <AccountMenuItem
            title="Cài đặt"
            description="Thông báo, giao diện và bảo mật tài khoản"
            icon={Settings}
            href="/tasker/settings"
          />
        </AccountSection>

        <AccountSection title="Hoạt động đối tác">
          <AccountMenuItem
            title="Đánh giá từ khách hàng"
            description="Xem điểm số và nhận xét sau mỗi công việc"
            icon={Star}
            href="/tasker/reviews"
          />
          <AccountMenuItem
            title="Chính sách đối tác"
            description="Quy định làm việc, quyền lợi và trách nhiệm"
            icon={ScrollText}
            href="/tasker/policies"
          />
        </AccountSection>

        <AccountSection title="Hỗ trợ và an toàn">
          <AccountMenuItem
            title="Trung tâm hỗ trợ"
            description="Gửi yêu cầu và theo dõi phản hồi từ CleanZ"
            icon={Headphones}
            href="/tasker/support-tickets"
          />
          <AccountMenuItem
            title="Báo cáo sự cố"
            description="Báo cáo vấn đề phát sinh trong quá trình làm việc"
            icon={ShieldAlert}
            href="/tasker/incidents"
          />
          <AccountMenuItem
            title="Đăng xuất"
            description="Kết thúc phiên làm việc trên thiết bị này"
            icon={LogOut}
            onClick={() => setLogoutOpen(true)}
            destructive
          />
        </AccountSection>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          Tài khoản của bạn được bảo vệ bởi CleanZ
        </div>
      </div>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận đăng xuất?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn sẽ kết thúc phiên làm việc hiện tại và quay về trang đăng nhập
              Tasker.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Ở lại</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {logout.isPending ? "Đang đăng xuất..." : "Đăng xuất"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
