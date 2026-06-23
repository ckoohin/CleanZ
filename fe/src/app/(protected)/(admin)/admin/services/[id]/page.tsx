"use client";

import React, { use } from "react";
import { ArrowLeft, Loader2, Info, ListOrdered, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { BaseButton } from "@/components/ui/base/base_button";
import { useAdminServiceDetail } from "@/features/admin/modules/service/hooks/useAdminServices";
import BaseEmptyState from "@/components/ui/base/base_empty_state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceOverviewTab } from "@/features/admin/modules/service/_components/detail/ServiceOverviewTab";
import { ServiceBookingsTab } from "@/features/admin/modules/service/_components/detail/ServiceBookingsTab";
import { ServiceTaskersTab } from "@/features/admin/modules/service/_components/detail/ServiceTaskersTab";
import { ServicePricingTab } from "@/features/admin/modules/service/_components/detail/ServicePricingTab";
import { DollarSign } from "lucide-react";

export default function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const { data: service, isLoading, isError } = useAdminServiceDetail(id);

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
            Chi tiết dịch vụ
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Mã dịch vụ: <span className="font-mono font-bold text-primary">{service.serviceCode}</span>
          </p>
        </div>
      </div>

      <div className="bg-card border border-border/50 shadow-sm rounded-3xl p-6 md:p-8">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-muted/50 p-1.5 rounded-2xl h-auto">
            <TabsTrigger value="overview" className="rounded-xl py-3 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary font-medium transition-all">
              <Info className="w-4 h-4 mr-2" />
              Tổng quan
            </TabsTrigger>
            <TabsTrigger value="pricing" className="rounded-xl py-3 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary font-medium transition-all">
              <DollarSign className="w-4 h-4 mr-2" />
              Bảng giá
            </TabsTrigger>
            <TabsTrigger value="bookings" className="rounded-xl py-3 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary font-medium transition-all">
              <ListOrdered className="w-4 h-4 mr-2" />
              Lịch sử Đặt lịch
            </TabsTrigger>
            <TabsTrigger value="taskers" className="rounded-xl py-3 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary font-medium transition-all">
              <Users className="w-4 h-4 mr-2" />
              Nhân sự phục vụ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 animate-in fade-in-50 duration-500">
            <ServiceOverviewTab service={service} />
          </TabsContent>

          <TabsContent value="pricing" className="mt-0 animate-in fade-in-50 duration-500">
            <ServicePricingTab service={service} />
          </TabsContent>

          <TabsContent value="bookings" className="mt-0 animate-in fade-in-50 duration-500">
            <ServiceBookingsTab serviceId={id} />
          </TabsContent>

          <TabsContent value="taskers" className="mt-0 animate-in fade-in-50 duration-500">
            <ServiceTaskersTab serviceId={id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
