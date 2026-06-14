"use client";

import React from "react";
import { CustomerListTable } from "@/features/admin-customer/_components/CustomerListTable";
import { Users, ShieldAlert, Sparkles } from "lucide-react";

export default function AdminCustomersPage() {
  return (
    <main className="min-h-screen bg-background py-6">
      <div className="w-full space-y-6">
        {/* Header Title */}
        <div className="space-y-2 pl-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldAlert size={14} /> Hệ thống quản trị
          </div>
          <h1 className="text-3xl font-black text-balance leading-tight tracking-tight flex items-center gap-2">
            Quản lý khách hàng <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
            Xem danh sách khách hàng, theo dõi lịch sử đặt đơn, địa chỉ và quản lý trạng thái tài khoản hoạt động của khách hàng.
          </p>
        </div>

        {/* Customer list component container */}
        <div className="bg-card border-y sm:border sm:border-border/50 sm:rounded-2xl shadow-sm p-3 sm:p-4 w-full">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold">Danh sách khách hàng CleanZ</h2>
          </div>

          <CustomerListTable />
        </div>
      </div>
    </main>
  );
}
