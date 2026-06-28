"use client";

import React from "react";
import { NotificationAdminPanel } from "@/features/admin/modules/notifications/_components/NotificationAdminPanel";
import { PageHeader } from "@/components/admin";
import { Bell } from "lucide-react";

export default function AdminNotificationsPage() {
  return (
    <main className="min-h-screen bg-[var(--c-card)] py-6">
      <div className="w-full space-y-6">
        <PageHeader
          title="Quản lý Thông báo"
          description="Xem lịch sử thông báo và broadcast hàng loạt đến khách hàng hoặc Tasker."
        />

        <div className="bg-[var(--c-card)] border-y sm:border sm:border-[var(--c-line)] sm:rounded-2xl shadow-sm p-3 sm:p-4 w-full">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--c-line)]">
            <div className="w-10 h-10 rounded-xl bg-[var(--c-primary-soft)] flex items-center justify-center text-[var(--c-primary-strong)] shadow-inner shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-[var(--c-ink)]">Lịch sử thông báo</h2>
          </div>
          <NotificationAdminPanel />
        </div>
      </div>
    </main>
  );
}
