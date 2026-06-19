"use client";

import React from "react";
import { SupportTicketTable } from "@/features/admin/modules/support-tickets/_components/SupportTicketTable";
import { HeadphonesIcon, Sparkles } from "lucide-react";

export default function AdminSupportTicketsPage() {
  return (
    <main className="min-h-screen bg-background py-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="space-y-2 pl-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            <HeadphonesIcon size={14} /> Hỗ trợ khách hàng
          </div>
          <h1 className="text-3xl font-black text-balance leading-tight tracking-tight flex items-center gap-2">
            Quản lý Ticket hỗ trợ{" "}
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
            Xem hàng đợi ticket, xử lý khiếu nại, gán admin, đổi trạng thái và ghi nhận kết luận.
          </p>
        </div>

        {/* Table container */}
        <div className="bg-card border-y sm:border sm:border-border/50 sm:rounded-2xl shadow-sm p-3 sm:p-4 w-full">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner shrink-0">
              <HeadphonesIcon className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold">Hàng đợi Ticket</h2>
          </div>
          <SupportTicketTable />
        </div>
      </div>
    </main>
  );
}
