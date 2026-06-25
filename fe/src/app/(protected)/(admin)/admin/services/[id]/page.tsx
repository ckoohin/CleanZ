"use client";

import React, { use } from "react";
import { ArrowLeft, Loader2, LayoutDashboard, DollarSign, Package, ScrollText, Star, Activity, BarChart3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { BaseButton } from "@/components/ui/base/base_button";
import {
  useAdminPackageDetail,
  useUpdateAdminPackage,
} from "@/features/admin/modules/service/hooks/useAdminServices";
import BaseEmptyState from "@/components/ui/base/base_empty_state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Tab components
import { PackageHero } from "@/features/admin/modules/service/_components/detail/PackageHero";
import { PackageOverviewTab } from "@/features/admin/modules/service/_components/detail/PackageOverviewTab";
import { PackagePricingTab } from "@/features/admin/modules/service/_components/detail/PackagePricingTab";
import { PackageSubServicesTab } from "@/features/admin/modules/service/_components/detail/PackageSubServicesTab";
import { PackageTermsTab } from "@/features/admin/modules/service/_components/detail/PackageTermsTab";
import { PackageReviewsTab } from "@/features/admin/modules/service/_components/detail/PackageReviewsTab";
import { PackageStatsTab } from "@/features/admin/modules/service/_components/detail/PackageStatsTab";
import { PackageOperationsTab } from "@/features/admin/modules/service/_components/detail/PackageOperationsTab";

const TABS = [
  { value: "overview",     label: "Tổng quan",       icon: LayoutDashboard },
  { value: "pricing",     label: "Bảng giá",         icon: DollarSign },
  { value: "sub-services",label: "Dịch vụ con",      icon: Package },
  { value: "terms",       label: "Chính sách & ĐK",  icon: ScrollText },
  { value: "reviews",     label: "Đánh giá",          icon: Star },
  { value: "operations",  label: "Vận hành",          icon: Activity },
  { value: "stats",       label: "Thống kê",          icon: BarChart3 },
];

export default function ServicePackageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const { data: pkg, isLoading, isError } = useAdminPackageDetail(id);
  const updateMutation = useUpdateAdminPackage();

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (isError || !pkg) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BaseEmptyState
          title="Không tìm thấy gói dịch vụ"
          description="Gói dịch vụ này có thể đã bị xóa hoặc không tồn tại."
        />
        <BaseButton className="mt-6" onClick={() => router.push("/admin/services")}>
          Quay lại danh sách
        </BaseButton>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Back button */}
      <div className="flex items-center gap-3">
        <BaseButton
          variant="outline"
          size="icon"
          onClick={() => router.push("/admin/services")}
          className="rounded-full h-10 w-10 shrink-0"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        </BaseButton>
        <div>
          <p className="text-xs text-muted-foreground font-medium">Quản lý Gói Dịch vụ</p>
          <h1 className="text-lg font-bold text-foreground leading-tight">{pkg.name}</h1>
        </div>
      </div>

      {/* Hero section */}
      <PackageHero
        pkg={pkg}
        onToggle={() => updateMutation.mutate({ id: pkg.id, payload: { isActive: !pkg.isActive } })}
        isToggling={updateMutation.isPending}
      />

      {/* Main tabs */}
      <div className="bg-card border border-border/50 shadow-sm rounded-3xl p-5 md:p-8">
        <Tabs defaultValue="overview" className="w-full">
          {/* Tab list - scrollable on mobile */}
          <div className="overflow-x-auto scrollbar-hide mb-8">
            <TabsList className="inline-flex w-max min-w-full bg-muted/50 p-1.5 rounded-2xl h-auto gap-1">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-xl py-2.5 px-4 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary font-medium transition-all text-sm gap-1.5"
                >
                  <tab.icon className="w-4 h-4" aria-hidden="true" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Tab contents */}
          <TabsContent value="overview" className="mt-0 animate-in fade-in-50 duration-300">
            <PackageOverviewTab pkg={pkg} />
          </TabsContent>

          <TabsContent value="pricing" className="mt-0 animate-in fade-in-50 duration-300">
            <PackagePricingTab pkg={pkg} />
          </TabsContent>

          <TabsContent value="sub-services" className="mt-0 animate-in fade-in-50 duration-300">
            <PackageSubServicesTab pkg={pkg} />
          </TabsContent>

          <TabsContent value="terms" className="mt-0 animate-in fade-in-50 duration-300">
            <PackageTermsTab pkg={pkg} />
          </TabsContent>

          <TabsContent value="reviews" className="mt-0 animate-in fade-in-50 duration-300">
            <PackageReviewsTab packageId={id} />
          </TabsContent>

          <TabsContent value="operations" className="mt-0 animate-in fade-in-50 duration-300">
            <PackageOperationsTab pkg={pkg} />
          </TabsContent>

          <TabsContent value="stats" className="mt-0 animate-in fade-in-50 duration-300">
            <PackageStatsTab packageId={id} packageName={pkg.name} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
