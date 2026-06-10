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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import ConfirmDialog from "@/components/common/ConfirmDialog";


const MENU_ITEMS = [
  { icon: User, label: "Hồ sơ của tôi", href: "/customer/profile" },
  { icon: CalendarDays, label: "Lịch đặt dịch vụ", href: "customer/bookings" },
  { icon: Heart, label: "Dịch vụ yêu thích", href: "/customer/favorites" },
  { icon: Shield, label: "Bảo mật tài khoản", href: "/customer/security" },
  { icon: Settings, label: "Cài đặt", href: "/customer/settings" },
];

export const AvatarProfile: React.FC = () => {
  const { data: profile, isLoading } = useProfile();

  const logout = useLogout()

  if (isLoading) return <>
    <Skeleton className="w-8 h-8 rounded-full" />
    <Skeleton className="w-24 h-4" />
  </>

  if (!profile) return <></>
  
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

          {/* Dành cho Đối tác / Thợ */}
          <div className="p-1.5">
            {profile.role === 'TASKER' || profile.role === 'ADMIN' ? (
              <DropdownMenuItem asChild className="rounded-xl px-3 py-2.5 cursor-pointer text-primary focus:bg-primary/10">
                <Link href="/tasker" className="flex items-center gap-3 text-sm font-bold">
                  <BriefcaseBusiness className="w-4 h-4 shrink-0" />
                  Khu vực Đối tác (Tasker)
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem asChild className="rounded-xl px-3 py-2.5 cursor-pointer text-primary focus:bg-primary/10">
                <Link href="/become-partner" className="flex items-center gap-3 text-sm font-bold">
                  <BriefcaseBusiness className="w-4 h-4 shrink-0" />
                  Trở thành đối tác dọn dẹp ngay
                </Link>
              </DropdownMenuItem>
            )}
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
