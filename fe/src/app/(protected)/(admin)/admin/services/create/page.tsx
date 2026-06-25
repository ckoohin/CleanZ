"use client";

import React from "react";
import { ArrowLeft, Wrench, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { BaseButton } from "@/components/ui/base/base_button";
import { ServiceForm } from "@/features/admin/modules/service/_components/ServiceForm";
import { useCreateAdminService, useAdminPackages } from "@/features/admin/modules/service/hooks/useAdminServices";
import { usePricingConfigs } from "@/features/admin/hooks/useAdminPricing";
import { CreateAdminServiceDto } from "@/features/admin/modules/service/services/admin-services.service";

export default function CreateServicePage() {
  const router = useRouter();
  const createMutation = useCreateAdminService();
  const { data: categories } = useAdminPackages();
  const { data: pricingData } = usePricingConfigs({ limit: 100 });

  const handleSubmit = (values: CreateAdminServiceDto) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        router.push("/admin/services");
      },
    });
  };

  return (
    <div className="space-y-6 w-full pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BaseButton
          variant="outline"
          size="icon"
          onClick={() => router.push("/admin/services")}
          className="rounded-full h-10 w-10 shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </BaseButton>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium">Quản lý Dịch vụ</p>
          <h1 className="text-2xl font-black text-foreground leading-tight">
            Thêm dịch vụ con mới
          </h1>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/20 rounded-2xl">
          <Wrench className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-primary">Dịch vụ con độc lập</span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 rounded-2xl">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Dịch vụ con</strong> là đơn vị dịch vụ cụ thể (VD: Dọn nhà 2 giờ, Tổng vệ sinh, ...).
          Sau khi tạo, bạn có thể gán dịch vụ này vào một hoặc nhiều gói dịch vụ.
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-card border border-border/50 shadow-sm rounded-3xl p-6 md:p-8">
        <ServiceForm
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isPending}
          categories={categories || []}
          pricingConfigs={pricingData?.items || []}
        />
      </div>
    </div>
  );
}
