'use client';

import React from 'react';
import { ShieldAlert, Sparkles, FileText } from 'lucide-react';
import { PolicyListTable } from '@/features/admin/admin-policy/components/PolicyListTable';

export default function AdminPoliciesPage() {
  return (
    <main className="min-h-screen bg-background py-6">
      <div className="w-full space-y-6">
        {/* Header Title */}
        <div className="space-y-2 pl-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldAlert size={14} /> Hệ thống quản trị
          </div>

          <h1 className="text-3xl font-black text-balance leading-tight tracking-tight flex items-center gap-2">
            Quản lý chính sách{' '}
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          </h1>

          <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
            Quản lý các chính sách hiển thị cho khách hàng, tasker và toàn bộ hệ thống CleanZ.
          </p>
        </div>

        {/* Policy list component container */}
        <div className="bg-card border-y sm:border sm:border-border/50 sm:rounded-2xl shadow-sm p-3 sm:p-4 w-full">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold">Danh sách chính sách CleanZ</h2>
          </div>

          <PolicyListTable />
        </div>
      </div>
    </main>
  );
}