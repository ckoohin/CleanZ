"use client";

import React, { use } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { BaseButton } from "@/components/ui/base/base_button";
import { ServiceForm } from "@/features/admin/modules/service/_components/ServiceForm";
import { useAdminServiceDetail, useUpdateAdminService, useAdminPackages } from "@/features/admin/modules/service/hooks/useAdminServices";
import { usePricingConfigs } from "@/features/admin/hooks/useAdminPricing";
import { UpdateAdminServiceDto } from "@/features/admin/modules/service/services/admin-services.service";
import BaseEmptyState from "@/components/ui/base/base_empty_state";

export default function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const { data: response, isLoading, isError } = useAdminServiceDetail(id);
  const updateMutation = useUpdateAdminService();
  const { data: categories } = useAdminPackages();
  const { data: pricingData } = usePricingConfigs({ limit: 100 });

  const service = response;

  const handleSubmit = (values: UpdateAdminServiceDto) => {
    updateMutation.mutate(
      { id, payload: values },
      {
        onSuccess: () => {
          router.push("/admin/services");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (isError || !service) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BaseEmptyState 
          title="Không tìm thấy dịch vụ" 
          description="Dịch vụ này có thể đã bị xóa hoặc không tồn tại." 
        />
        <BaseButton className="mt-6" onClick={() => router.push("/admin/services")}>
          Quay lại danh sách
        </BaseButton>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Cập nhật dịch vụ
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Chỉnh sửa thông tin chi tiết của dịch vụ <span className="font-bold text-primary">{service.name}</span>
          </p>
        </div>
      </div>

      <div className="bg-card border border-border/50 shadow-sm rounded-3xl p-6 md:p-8">
        <ServiceForm 
          initialValues={service}
          onSubmit={handleSubmit} 
          isSubmitting={updateMutation.isPending} 
          categories={categories || []}
          pricingConfigs={pricingData?.items || []}
          isEditMode
        />
      </div>
    </div>
  );
}
