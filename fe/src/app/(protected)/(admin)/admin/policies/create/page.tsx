"use client";

import { ShieldAlert, Sparkles } from "lucide-react";
import { PolicyEditView } from "@/features/admin/admin-policy/components/PolicyEditView";

export default function AdminCreatePolicyPage() {
  return (
    <main className="min-h-screen bg-background py-6">
      <div className="w-full space-y-6">
        <div className="space-y-2 pl-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldAlert size={14} /> Hệ thống quản trị
          </div>

          <h1 className="text-3xl font-black text-balance leading-tight tracking-tight flex items-center gap-2">
            Tạo chính sách mới
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          </h1>

          <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
            Tạo policy mới để hiển thị cho khách hàng, tasker hoặc toàn bộ hệ thống CleanZ.
          </p>
        </div>

        <PolicyEditView mode="create" />
      </div>
    </main>
  );
}