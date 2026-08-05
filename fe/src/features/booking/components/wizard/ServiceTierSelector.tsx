"use client";

import React from "react";
import {
  BadgeCheck,
  Crown,
  Heart,
  Sparkles,
  Wrench,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import type { BookingServiceTier } from "@/features/booking/types/booking.types";
import { FavoriteTaskerPicker } from "./FavoriteTaskerPicker";

interface ServiceTierSelectorProps {
  value: BookingServiceTier;
  onChange: (tier: BookingServiceTier) => void;
  preferredTaskerId?: string;
  onPreferredTaskerChange: (taskerId: string | undefined) => void;
  /** Chênh lệch giá của hạng Cao cấp, lấy từ báo giá của BE. */
  premiumFee?: number;
  isQuoting?: boolean;
  scheduledDate?: string;
  scheduledTime?: string;
  durationHours?: number;
  /** Ẩn phần chọn Tasker khi bộ chọn hạng được đặt trước bước chọn lịch. */
  showPreferredTaskerPicker?: boolean;
  /** Chỉ cho chọn Cao cấp khi gói đã cấu hình đơn giá hợp lệ. */
  premiumAvailable?: boolean;
}

const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    n,
  );

const PREMIUM_BENEFITS = [
  { icon: BadgeCheck, label: "Tasker đã được admin xác minh" },
  { icon: Wrench, label: "Dụng cụ & hoá chất chuyên dụng đã được duyệt" },
  { icon: Heart, label: "Ưu tiên chọn nhân viên bạn hài lòng" },
];

export const ServiceTierSelector: React.FC<ServiceTierSelectorProps> = ({
  value,
  onChange,
  preferredTaskerId,
  onPreferredTaskerChange,
  premiumFee,
  isQuoting,
  scheduledDate,
  scheduledTime,
  durationHours,
  showPreferredTaskerPicker = true,
  premiumAvailable = true,
}) => {
  const isPremium = value === "PREMIUM";
  const premiumSwitchId = React.useId();

  const handlePremiumToggle = (checked: boolean) => {
    if (checked && !premiumAvailable) return;

    const tier: BookingServiceTier = checked ? "PREMIUM" : "STANDARD";
    onChange(tier);
    // Thợ chỉ định chỉ có ý nghĩa với đơn Cao cấp — hạ hạng thì bỏ luôn.
    if (!checked) onPreferredTaskerChange(undefined);
  };

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-foreground flex items-center gap-2 text-sm uppercase tracking-wide">
        <Sparkles className="w-4 h-4 text-primary" />
        Hạng dịch vụ
      </h3>

      <div
        className={cn(
          "rounded-xl border-2 p-4 transition-colors",
          isPremium
            ? "border-amber-500 bg-amber-500/5"
            : "border-primary bg-primary/5",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="font-extrabold text-foreground">
              {isPremium ? "Hạng Cao cấp" : "Tiêu chuẩn"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {isPremium
                ? "Ưu tiên Tasker đã được duyệt dụng cụ chuyên dụng."
                : "Hạng mặc định, ghép với thợ phù hợp gần bạn."}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <label
              htmlFor={premiumSwitchId}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1 text-sm font-extrabold",
                isPremium ? "text-amber-600" : "text-foreground",
                !premiumAvailable && "cursor-not-allowed opacity-60",
              )}
            >
              <Crown className="size-4 text-amber-500" />
              Premium
            </label>
            <Switch
              id={premiumSwitchId}
              checked={isPremium}
              disabled={!premiumAvailable}
              onCheckedChange={handlePremiumToggle}
              aria-label="Bật hoặc tắt hạng Premium"
              className="data-[state=checked]:bg-amber-500"
            />
          </div>
        </div>

        <div
          className={cn(
            "mt-3 border-t pt-3 text-xs",
            !premiumAvailable
              ? "border-border/60 text-muted-foreground"
              : isPremium
                ? "border-amber-500/30 text-amber-700"
                : "border-primary/20 text-muted-foreground",
          )}
        >
          {!premiumAvailable ? (
            "Gói này chưa cấu hình đơn giá Cao cấp."
          ) : isQuoting ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" /> Đang tính giá…
            </span>
          ) : premiumFee && premiumFee > 0 ? (
            <>
              Bật Premium để tăng chất lượng dịch vụ
            </>
          ) : (
            "Bật Premium để đặt Tasker có dụng cụ chuyên dụng đã được duyệt."
          )}
        </div>
      </div>

      {isPremium && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <ul className="space-y-1.5">
            {PREMIUM_BENEFITS.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-start gap-2 text-xs text-foreground/80"
              >
                <Icon className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                {label}
              </li>
            ))}
          </ul>

          {showPreferredTaskerPicker && (
            <div className="pt-1 border-t border-amber-500/20">
              <FavoriteTaskerPicker
                value={preferredTaskerId}
                onChange={onPreferredTaskerChange}
                scheduledDate={scheduledDate}
                scheduledTime={scheduledTime}
                durationHours={durationHours}
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                Tasker được chọn sẽ nhận lời mời riêng trước; nếu họ không nhận,
                hệ thống tự tìm tasker khác.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
