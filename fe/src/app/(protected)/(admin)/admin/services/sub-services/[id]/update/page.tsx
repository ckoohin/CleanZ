"use client";

import React, { use } from "react";
import { ArrowLeft, Wrench, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { BaseButton } from "@/components/ui/base/base_button";
import { ServiceForm } from "@/features/admin/modules/service/_components/ServiceForm";
import { 
  useAdminServiceDetail, 
  useUpdateAdminService, 
  useAdminPackages 
} from "@/features/admin/modules/service/hooks/useAdminServices";
import { usePricingConfigs } from "@/features/admin/hooks/useAdminPricing";
import { UpdateAdminServiceDto } from "@/features/admin/modules/service/services/admin-services.service";
import BaseEmptyState from "@/components/ui/base/base_empty_state";
import { ROUTES } from "@/constants/routes";

export default function UpdateSubServicePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const { data: service, isLoading, isError } = useAdminServiceDetail(id);
  const updateMutation = useUpdateAdminService();
  const { data: categories } = useAdminPackages();
  const { data: pricingData } = usePricingConfigs({ limit: 100 });

  const handleSubmit = (values: UpdateAdminServiceDto) => {
    updateMutation.mutate(
      { id, payload: values },
      {
        onSuccess: () => {
          router.push(ROUTES.ADMIN.SERVICES.SUB_SERVICES.BASE);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="w-8 h-8 text-(--c-primary-strong) animate-spin" />
      </div>
    );
  }

  if (isError || !service) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BaseEmptyState 
          title="Không tìm thấy dịch vụ con" 
          description="Dịch vụ con này có thể đã bị xóa hoặc không tồn tại." 
        />
        <BaseButton className="mt-6" onClick={() => router.push(ROUTES.ADMIN.SERVICES.SUB_SERVICES.BASE)}>
          Quay lại danh sách
        </BaseButton>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BaseButton
          variant="outline"
          size="icon"
          onClick={() => router.push(ROUTES.ADMIN.SERVICES.SUB_SERVICES.BASE)}
          className="rounded-full h-10 w-10 shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </BaseButton>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium">Quản lý Dịch vụ</p>
          <h1 className="text-2xl font-black text-foreground leading-tight">
            Cập nhật dịch vụ con
          </h1>
          <p className="text-(--c-muted) text-sm mt-1">
            Chỉnh sửa thông tin chi tiết của dịch vụ <span className="font-bold text-(--c-primary-strong)">{service.name}</span>
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/20 rounded-2xl">
          <Wrench className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-primary">Dịch vụ con độc lập</span>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-(--c-card) border border-(--c-line)/50 shadow-sm rounded-3xl p-6 md:p-8">
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
