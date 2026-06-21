"use client";
import React, { useState, useRef, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  CalendarDays,
  Heart,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
  BriefcaseBusiness,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useLogout, useProfile } from "@/features/auth/hooks/auth.hooks";
import { useTaskerProfile } from "@/features/tasker/hooks/tasker.hooks";
import { TaskerStatus } from "@/features/tasker/types/tasker.type";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmDialog from "@/components/common/ConfirmDialog";


const MENU_ITEMS = [
  { icon: User, label: "Hồ sơ của tôi", href: "/customer/profile" },
  { icon: CalendarDays, label: "Lịch đặt dịch vụ", href: "customer/bookings" },
  { icon: Heart, label: "Dịch vụ yêu thích", href: "/customer/favorites" },
  { icon: Shield, label: "Bảo mật tài khoản", href: "/customer/security" },
  { icon: Settings, label: "Cài đặt", href: "/customer/settings" },
];

type PartnerMenuItem = { href: string; label: string };

function getPartnerMenuItem(
  role: string | undefined,
  approvalStatus: TaskerStatus | undefined,
): PartnerMenuItem {
  if (role === "TASKER" || role === "ADMIN") {
    return { href: "/tasker", label: "Khu vực Đối tác (Tasker)" };
  }
  switch (approvalStatus) {
    case TaskerStatus.NEED_INFO:
      return { href: "/become-partner/signup", label: "Bổ sung hồ sơ đối tác" };
    case TaskerStatus.REJECTED:
      return { href: "/become-partner/signup", label: "Nộp lại hồ sơ đối tác" };
    case TaskerStatus.PENDING:
      return { href: "/become-partner/signup", label: "Hồ sơ đang chờ duyệt" };
    default:
      return { href: "/become-partner", label: "Trở thành đối tác dọn dẹp ngay" };
  }
}

export const AvatarProfile: React.FC = () => {
  const { data: profile, isLoading } = useProfile();

  const logout = useLogout()

  // Chỉ truy vấn hồ sơ tasker cho CUSTOMER để biết nút cần hiện "Bổ sung / Nộp lại".
  const isCustomer = profile?.role === "CUSTOMER";
  const { data: taskerProfile } = useTaskerProfile({ enabled: isCustomer });

  if (isLoading) return <>
    <Skeleton className="w-8 h-8 rounded-full" />
    <Skeleton className="w-24 h-4" />
  </>

  if (!profile) return <></>

  const partnerItem = getPartnerMenuItem(
    profile.role,
    taskerProfile?.approvalStatus,
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-muted transition-colors outline-none">
            <div className="relative">
              <Avatar className="w-8 h-8">
                <AvatarImage src={profile.avatar as string} alt={profile.fullName} />
                <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                  {profile.fullName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-background rounded-full" />
            </div>
            <div className="hidden lg:flex flex-col items-start">
              <span className="text-xs font-semibold text-foreground leading-tight">{profile.fullName}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{profile.email}</span>
            </div>
            <ChevronDown className="hidden lg:block w-3 h-3 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="center" sideOffset={8} className=" rounded-2xl p-0 overflow-hidden md:w-64 mr-10">

          <div className="px-4 py-3.5 flex items-center gap-3 bg-muted/40">
            <Avatar className="w-10 h-10">
              <AvatarImage src={profile.avatar as string} alt={profile.fullName} />
              <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                {profile.fullName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{profile.fullName}</p>
              <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
            </div>
            <span className="shrink-0 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full">
              {profile.provider}
              {/* Pro */}
            </span>
          </div>

          <DropdownMenuSeparator />

          <div className="p-1.5">
            {MENU_ITEMS.map(({ icon: Icon, label, href }) => (
              <DropdownMenuItem key={label} asChild className="rounded-xl px-3 py-2.5 cursor-pointer">
                <Link href={href} className="flex items-center gap-3 text-sm">
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </Link>
              </DropdownMenuItem>
            ))}
          </div>

          <DropdownMenuSeparator />

          {/* Dành cho Đối tác / Thợ — nhãn & đích đến thay đổi theo trạng thái hồ sơ */}
          <div className="p-1.5">
            <DropdownMenuItem asChild className="rounded-xl px-3 py-2.5 cursor-pointer text-primary focus:bg-primary/10">
              <Link href={partnerItem.href} className="flex items-center gap-3 text-sm font-bold">
                <BriefcaseBusiness className="w-4 h-4 shrink-0" />
                {partnerItem.label}
              </Link>
            </DropdownMenuItem>
          </div>

          <DropdownMenuSeparator />

          <div className="p-1.5">
            <ConfirmDialog
              trigger={
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="rounded-xl px-3 py-2.5 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                  <LogOut className="w-4 h-4 shrink-0" />
                  Đăng xuất
                </DropdownMenuItem>
              }
              title="Xác nhận đăng xuất"
              description="Bạn có chắc chắn muốn đăng xuất?"
              confirmText="Đăng xuất"
              cancelText="Hủy"
              onConfirm={() => {
                logout.mutate()
              }}
            />
          </div>

        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
