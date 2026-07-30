"use client";

import React from "react";
import { PackageOpen, CheckCircle2, AlertTriangle, Shirt, Brush, Wrench } from "lucide-react";
import { AdminCard } from "@/components/admin";
import { Badge } from "@/components/ui/badge";
import { useAdminTaskerEquipments } from "../hooks/admin-tasker.hooks";
import type { TaskerEquipmentItem } from "../types/admin-tasker.types";

const MOCK_EQUIPMENTS = [
  {
    id: "eq_01",
    name: "Đồng phục áo thun (Size L)",
    type: "UNIFORM",
    issuedAt: "2025-10-12T10:00:00Z",
    status: "ISSUED", // ISSUED, PENDING, RETURNED
    price: 150000,
    paid: true,
  },
  {
    id: "eq_02",
    name: "Tạp dề chống nước",
    type: "UNIFORM",
    issuedAt: "2025-10-12T10:00:00Z",
    status: "ISSUED",
    price: 80000,
    paid: true,
  },
  {
    id: "eq_03",
    name: "Bộ dụng cụ vệ sinh cơ bản (Kit)",
    type: "CLEANING_KIT",
    issuedAt: "2025-10-15T09:00:00Z",
    status: "ISSUED",
    price: 500000,
    paid: false,
    remainingDebt: 250000, // Đang trừ nợ dần
  },
];

export const TaskerEquipmentsTab: React.FC<{ taskerId: string }> = ({ taskerId }) => {
  const { data: equipmentsResponse, isLoading } = useAdminTaskerEquipments(taskerId);
  const data = equipmentsResponse?.data || { equipments: [], debt: null };

  const equipments = data.equipments.length > 0 ? data.equipments : MOCK_EQUIPMENTS;
  const totalDebt = data.debt?.totalDebt ?? 250000;
  
  if (isLoading) return <div className="p-8 text-center text-[var(--c-muted)]">Đang tải trang bị...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-[rgba(217,119,6,0.1)] border border-[rgba(217,119,6,0.2)] rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-bold tracking-wider text-[#D97706]">Công nợ trang bị</p>
            <p className="text-3xl font-black text-[#D97706] mt-1">{totalDebt.toLocaleString()} đ</p>
            <p className="text-xs text-[#D97706]/70 mt-1">Đang trừ dần vào thu nhập hàng tuần</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-[rgba(217,119,6,0.2)] flex items-center justify-center text-[#D97706]">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
        
        <div className="bg-[rgba(14,159,110,0.1)] border border-[rgba(14,159,110,0.2)] rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-bold tracking-wider text-[#0E9F6E]">Tiền ký quỹ (Deposit)</p>
            <p className="text-3xl font-black text-[#0E9F6E] mt-1">400.000 đ</p>
            <p className="text-xs text-[#0E9F6E]/70 mt-1">Đã đóng đủ 100%</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-[rgba(14,159,110,0.2)] flex items-center justify-center text-[#0E9F6E]">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      <AdminCard className="overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-[var(--c-line)] bg-[var(--c-card)]">
          <div className="flex items-center gap-2">
            <PackageOpen className="w-5 h-5 text-[var(--c-primary-strong)]" />
            <h3 className="text-sm font-bold text-[var(--c-ink)]">Tài sản cấp phát</h3>
          </div>
        </div>

        <div className="divide-y divide-[var(--c-line)]">
          {equipments.map((eq: TaskerEquipmentItem) => (
            <div key={eq.id} className="p-5 hover:bg-[var(--c-card-2)]/50 transition-colors flex items-center justify-between gap-4">
              <div className="flex gap-4 items-center">
                <div className="w-10 h-10 rounded-xl bg-[var(--c-card-2)] flex items-center justify-center text-[var(--c-muted)]">
                  {eq.type === "UNIFORM" ? <Shirt className="w-5 h-5" /> : <Brush className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="font-bold text-[var(--c-ink)]">{eq.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[var(--c-muted)]">Cấp ngày: {new Date(eq.issuedAt).toLocaleDateString("vi-VN")}</span>
                    <span className="text-xs text-[var(--c-muted)]">•</span>
                    <span className="text-xs font-semibold text-[var(--c-ink)]">Giá trị: {eq.price.toLocaleString()} đ</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <Badge variant="outline" className="bg-[#0E9F6E]/10 text-[#0E9F6E] border-[#0E9F6E]/30 text-[10px] uppercase font-bold tracking-wider">
                  Đã nhận
                </Badge>
                {eq.paid ? (
                  <span className="text-[10px] text-[#0E9F6E] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Đã thanh toán
                  </span>
                ) : (
                  <span className="text-[10px] text-[#D97706] font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Còn nợ: {eq.remainingDebt?.toLocaleString()} đ
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
};
