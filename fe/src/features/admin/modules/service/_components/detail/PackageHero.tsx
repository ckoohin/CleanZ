import React from "react";
import Image from "next/image";
import { Package, Star, Clock, MapPin, Image as ImageIcon } from "lucide-react";
import { AdminServicePackageEntity } from "@/features/admin/modules/service/services/admin-services.service";
import { Switch } from "@/components/ui/switch";

interface PackageHeroProps {
  pkg: AdminServicePackageEntity;
  onToggle: () => void;
  isToggling: boolean;
}

const vnd = (val: number | null | undefined) => {
  if (val === null || val === undefined) return "—";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(val);
};

export function PackageHero({ pkg, onToggle, isToggling }: PackageHeroProps) {
  const subCount = pkg.packageSubServices?.length ?? 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card to-muted/30 border border-border/50 shadow-sm">
      {/* Background blur image */}
      {pkg.iconUrl && (
        <div className="absolute inset-0 opacity-10">
          <Image src={pkg.iconUrl} alt="" fill className="object-cover blur-xl scale-110" />
        </div>
      )}

      <div className="relative z-10 flex flex-col md:flex-row gap-6 p-6">
        {/* Thumbnail */}
        <div className="relative h-40 w-40 md:h-44 md:w-44 rounded-2xl overflow-hidden border-2 border-border/50 bg-muted/60 shadow-md shrink-0">
          {pkg.iconUrl ? (
            <Image src={pkg.iconUrl} alt={pkg.name} fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ImageIcon className="w-12 h-12 text-muted-foreground/30" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-start gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">{pkg.name}</h1>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/15 text-primary font-bold">
                    {pkg.packageCode}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${pkg.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400"}`}>
                    {pkg.isActive ? "● Đang hoạt động" : "● Đã tắt"}
                  </span>
                </div>
              </div>
            </div>

            {pkg.policyDescription && (
              <p className="text-sm text-muted-foreground mt-3 max-w-2xl leading-relaxed line-clamp-2">
                {pkg.policyDescription}
              </p>
            )}
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-3">
            {[
              { icon: Package, label: `${subCount} dịch vụ con`, color: "text-primary" },
              { icon: Clock, label: `Tối đa ${pkg.maxHours} giờ`, color: "text-blue-500" },
              { icon: Star, label: "4.8 ★ rating", color: "text-amber-500" },
              { icon: MapPin, label: pkg.coverageAreas && pkg.coverageAreas.length > 0 ? `${pkg.coverageAreas.length} khu vực` : "Toàn quốc", color: "text-emerald-500" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background/70 backdrop-blur-sm border border-border/40 text-sm font-medium">
                <item.icon className={`w-4 h-4 ${item.color}`} aria-hidden="true" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-row md:flex-col items-center md:items-end gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-background/70 backdrop-blur-sm border border-border/40 px-3 py-2 rounded-xl">
            <span className="text-xs font-medium text-muted-foreground">
              {pkg.isActive ? "Bật" : "Tắt"}
            </span>
            <Switch
              checked={pkg.isActive}
              onCheckedChange={onToggle}
              disabled={isToggling}
            />
          </div>

          {/* KPI mini */}
          <div className="flex gap-2">
            {[
              { label: "Phụ thu đêm", value: vnd(pkg.nightSurcharge), icon: "🌙", show: pkg.nightSurcharge > 0 },
              { label: "Thú cưng", value: vnd(pkg.petSurcharge), icon: "🐾", show: pkg.petSurcharge > 0 },
              { label: "Phí dụng cụ", value: vnd(pkg.toolFee), icon: "🔧", show: pkg.toolFee > 0 },
            ]
              .filter((i) => i.show)
              .map((item) => (
                <div key={item.label} className="text-center bg-background/60 border border-border/40 rounded-xl px-3 py-2">
                  <div className="text-lg">{item.icon}</div>
                  <p className="text-[9px] text-muted-foreground font-medium leading-none mt-1">{item.label}</p>
                  <p className="text-xs font-bold text-foreground mt-0.5">{item.value}</p>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
