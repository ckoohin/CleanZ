"use client";

import React from "react";
import { Users, UserCheck, ShieldOff, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CustomerStatsBarProps {
  total: number;
  active: number;
  blocked: number;
  isLoading?: boolean;
}

const statCards = [
  {
    key: "total",
    label: "Tổng khách hàng",
    icon: Users,
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/20",
  },
  {
    key: "active",
    label: "Đang hoạt động",
    icon: UserCheck,
    colorClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/20",
  },
  {
    key: "blocked",
    label: "Bị khóa",
    icon: ShieldOff,
    colorClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-500/10",
    borderClass: "border-red-500/20",
  },
  {
    key: "ratio",
    label: "Tỉ lệ hoạt động",
    icon: TrendingUp,
    colorClass: "text-primary",
    bgClass: "bg-primary/10",
    borderClass: "border-primary/20",
  },
];

export const CustomerStatsBar: React.FC<CustomerStatsBarProps> = ({
  total,
  active,
  blocked,
  isLoading = false,
}) => {
  const ratio = total > 0 ? Math.round((active / total) * 100) : 0;

  const values: Record<string, string | number> = {
    total,
    active,
    blocked,
    ratio: `${ratio}%`,
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {statCards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className={`relative flex flex-col justify-between p-4 rounded-2xl border ${card.bgClass} ${card.borderClass} overflow-hidden transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {card.label}
              </p>
              <div className={`w-8 h-8 rounded-xl ${card.bgClass} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${card.colorClass}`} />
              </div>
            </div>
            <p className={`text-2xl font-black ${card.colorClass}`}>
              {values[card.key]}
            </p>
          </div>
        );
      })}
    </div>
  );
};
