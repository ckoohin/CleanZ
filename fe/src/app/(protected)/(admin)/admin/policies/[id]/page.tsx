"use client";

import { useParams } from "next/navigation";
import { ShieldAlert, Sparkles } from "lucide-react";
import { PolicyDetailView } from "@/features/admin/admin-policy/components/PolicyDetailView";

export default function AdminPolicyDetailPage() {
  const params = useParams();

  const id =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : "";

  return (
    <main className="min-h-screen bg-background py-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="space-y-2 pl-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldAlert size={14} /> Hệ thống quản trị
          </div>

          <h1 className="text-3xl font-black text-balance leading-tight tracking-tight flex items-center gap-2">
            Chi tiết chính sách
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          </h1>

          <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
            Xem đầy đủ nội dung, trạng thái và thông tin chi tiết của chính sách trong hệ thống CleanZ.
          </p>
        </div>

        <PolicyDetailView id={id} />
      </div>
    </main>
  );
}