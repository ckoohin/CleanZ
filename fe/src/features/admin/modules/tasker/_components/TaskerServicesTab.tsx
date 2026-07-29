"use client";

import React, { useState } from "react";
import { Briefcase, CheckCircle2, ShieldAlert, XCircle, Info, Sparkles } from "lucide-react";
import { AdminCard } from "@/components/admin";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAdminTaskerServices, useToggleTaskerService } from "../hooks/admin-tasker.hooks";
import type { TaskerServiceItem } from "../types/admin-tasker.types";

// Giả lập dữ liệu Services theo chuẩn Data Model v2
const MOCK_SERVICES = [
  {
    id: "svc_01",
    name: "Dọn dẹp nhà cửa",
    description: "Vệ sinh không gian sống, quét bụi, lau sàn.",
    isActive: true,
    passedTrainingAt: "2025-10-12T10:00:00Z",
    requiresCert: false,
  },
  {
    id: "svc_02",
    name: "Tổng vệ sinh",
    description: "Làm sạch sâu sau xây dựng hoặc định kỳ.",
    isActive: true,
    passedTrainingAt: "2025-11-20T14:30:00Z",
    requiresCert: false,
  },
  {
    id: "svc_03",
    name: "Vệ sinh máy lạnh",
    description: "Rửa, bơm ga, bảo trì điều hòa nhiệt độ.",
    isActive: false,
    passedTrainingAt: null,
    requiresCert: true,
    certUploaded: false,
  },
  {
    id: "svc_04",
    name: "Nấu ăn gia đình",
    description: "Đi chợ, nấu cơm theo yêu cầu khẩu vị.",
    isActive: true,
    passedTrainingAt: "2026-01-05T09:15:00Z",
    requiresCert: true,
    certUploaded: true,
  }
];

export const TaskerServicesTab: React.FC<{ taskerId: string }> = ({ taskerId }) => {
  const { data: servicesResponse, isLoading } = useAdminTaskerServices(taskerId);
  const toggleMutation = useToggleTaskerService();

  const servicesData = servicesResponse?.data || [];
  const services = servicesData.length > 0 ? servicesData : MOCK_SERVICES;

  const toggleService = (id: string, serviceId: string, currentStatus: boolean) => {
    // Nếu là mock thì không call API để tránh lỗi id mismatch
    if (serviceId.startsWith("svc_")) return;
    toggleMutation.mutate({ id: taskerId, serviceId, isActive: !currentStatus });
  };

  if (isLoading) return <div className="p-8 text-center text-[var(--c-muted)]">Đang tải danh sách dịch vụ...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[var(--c-primary)]/10 border border-[var(--c-primary)]/20 rounded-2xl p-5">
          <p className="text-xs uppercase font-bold tracking-wider text-[var(--c-primary-strong)]">Tổng dịch vụ</p>
          <p className="text-3xl font-black text-[var(--c-primary)] mt-1">{services.length}</p>
        </div>
        <div className="bg-[rgba(14,159,110,0.1)] border border-[rgba(14,159,110,0.2)] rounded-2xl p-5">
          <p className="text-xs uppercase font-bold tracking-wider text-[#0E9F6E]">Đang kích hoạt</p>
          <p className="text-3xl font-black text-[#0E9F6E] mt-1">{services.filter((s: TaskerServiceItem) => s.isActive).length}</p>
        </div>
        <div className="bg-[rgba(225,29,72,0.1)] border border-[rgba(225,29,72,0.2)] rounded-2xl p-5">
          <p className="text-xs uppercase font-bold tracking-wider text-[#E11D48]">Chưa đạt yêu cầu</p>
          <p className="text-3xl font-black text-[#E11D48] mt-1">{services.filter((s: TaskerServiceItem) => !s.passedTrainingAt).length}</p>
        </div>
      </div>

      <AdminCard className="overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-[var(--c-line)] bg-[var(--c-card)]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--c-primary-strong)]" />
            <h3 className="text-sm font-bold text-[var(--c-ink)]">Danh sách dịch vụ</h3>
          </div>
          <Badge variant="outline" className="bg-[var(--c-card-2)] text-[var(--c-muted)] text-[10px] font-bold">
            Map with tasker_services
          </Badge>
        </div>

        <div className="divide-y divide-[var(--c-line)]">
          {services.map((service: TaskerServiceItem) => (
            <div key={service.id} className="p-5 hover:bg-[var(--c-card-2)]/50 transition-colors flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-[var(--c-ink)]">{service.name}</h4>
                  {service.isActive ? (
                    <Badge variant="outline" className="h-5 text-[10px] uppercase font-bold bg-[#0E9F6E]/10 text-[#0E9F6E] border-[#0E9F6E]/30">Đang bật</Badge>
                  ) : (
                    <Badge variant="outline" className="h-5 text-[10px] uppercase font-bold bg-[var(--c-muted)]/10 text-[var(--c-muted)] border-[var(--c-muted)]/30">Đã tắt</Badge>
                  )}
                </div>
                <p className="text-sm text-[var(--c-muted)]">{service.description}</p>
                
                <div className="flex items-center gap-4 mt-3">
                  {service.passedTrainingAt ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[#0E9F6E]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Pass Test: {new Date(service.passedTrainingAt).toLocaleDateString("vi-VN")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[#E11D48]">
                      <XCircle className="w-3.5 h-3.5" /> Chưa qua đào tạo
                    </span>
                  )}

                  {service.requiresCert && (
                    <>
                      <Separator orientation="vertical" className="h-3" />
                      {service.certUploaded ? (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-[#2563EB]">
                          <Briefcase className="w-3.5 h-3.5" /> Đã nộp chứng chỉ
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-[#D97706]">
                          <ShieldAlert className="w-3.5 h-3.5" /> Thiếu chứng chỉ nghề
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <Switch 
                  checked={service.isActive}
                  disabled={!service.passedTrainingAt || toggleMutation.isPending}
                  onCheckedChange={() => toggleService(service.id, service.serviceId || service.id, service.isActive)}
                  className="data-[state=checked]:bg-[#0E9F6E]"
                />
                {!service.passedTrainingAt && (
                  <p className="text-[10px] text-[#E11D48] flex items-center gap-1">
                    <Info className="w-3 h-3" /> Yêu cầu pass test
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
};
