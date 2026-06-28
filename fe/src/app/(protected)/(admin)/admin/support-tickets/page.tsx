"use client";

import React from "react";
import { SupportTicketTable } from "@/features/admin/modules/support-tickets/_components/SupportTicketTable";
import { HeadphonesIcon } from "lucide-react";
import { PageHeader } from "@/components/admin";

export default function AdminSupportTicketsPage() {
  return (
    <main className="min-h-screen py-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <PageHeader
          title="Quản lý Ticket hỗ trợ"
          description="Xem hàng đợi ticket, xử lý khiếu nại, gán admin, đổi trạng thái và ghi nhận kết luận."
        />

        {/* Table container */}
        <div className="bg-[var(--c-card)] border-y sm:border sm:border-[var(--c-line)] sm:rounded-2xl shadow-sm p-3 sm:p-4 w-full">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--c-line)]">
            <div className="w-10 h-10 rounded-xl bg-[var(--c-primary-soft)] flex items-center justify-center text-[var(--c-primary-strong)] shadow-inner shrink-0">
              <HeadphonesIcon className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-[var(--c-ink)]">Hàng đợi Ticket</h2>
          </div>
          <SupportTicketTable />
        </div>
      </div>
    </main>
  );
}
