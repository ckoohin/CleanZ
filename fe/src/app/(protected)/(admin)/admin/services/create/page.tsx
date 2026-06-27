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
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--c-ink)]">
            Thêm dịch vụ con mới
          </h1>
          <p className="text-[var(--c-muted)] text-sm mt-1">
            Tạo mới một dịch vụ con độc lập và gán vào gói dịch vụ.
          </p>
        </div>
      </div>

      <div className="bg-[var(--c-card)] border border-[var(--c-line)]/50 shadow-sm rounded-3xl p-6 md:p-8">
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
