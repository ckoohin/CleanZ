"use client";

import * as React from "react";
import { Clock3, Loader2, Package, RotateCcw, Trash2 } from "lucide-react";
import { AdminButton, EmptyState, StatusBadge } from "@/components/admin";
import { useRestoreAdminPackage } from "@/features/admin/modules/service/hooks/useAdminServices";
import type { AdminServicePackageEntity } from "@/features/admin/modules/service/services/admin-services.service";

interface DeletedPackagesPageProps {
  packages: AdminServicePackageEntity[];
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  hasSearch: boolean;
  onRetry: () => void;
}

function formatDeletedAt(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const time = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const day = date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${time} · ${day}`;
}

export function DeletedPackagesPage({
  packages,
  totalCount,
  isLoading,
  isError,
  hasSearch,
  onRetry,
}: DeletedPackagesPageProps) {
  const restoreMutation = useRestoreAdminPackage();
  const [restoringId, setRestoringId] = React.useState<string | null>(null);

  const handleRestore = (id: string) => {
    setRestoringId(id);
    restoreMutation.mutate(id, {
      onSettled: () => setRestoringId(null),
    });
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] shadow-sm">
      <header className="flex flex-col gap-3 border-b border-[var(--c-line)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(225,29,72,0.12)] text-[#E11D48]">
            <Trash2 className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[var(--c-ink)]">
              Gói dịch vụ đã xóa
            </h2>
            <p className="mt-0.5 max-w-2xl text-[13px] leading-5 text-[var(--c-muted)]">
              Gói trong thùng rác không xuất hiện khi đặt đơn mới. Các đơn cũ
              vẫn được giữ nguyên để tra cứu.
            </p>
          </div>
        </div>
        <StatusBadge tone="danger">
          {totalCount} gói đã xóa
        </StatusBadge>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-[var(--c-muted)]">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Đang tải thùng rác…
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-3 px-5 py-16 text-center">
          <p className="text-sm font-semibold text-[#E11D48]">
            Không tải được danh sách gói đã xóa.
          </p>
          <AdminButton
            variant="secondary"
            size="sm"
            icon={<RotateCcw className="size-3.5" aria-hidden="true" />}
            onClick={onRetry}
          >
            Thử lại
          </AdminButton>
        </div>
      ) : packages.length === 0 ? (
        <EmptyState
          icon={Package}
          title={hasSearch ? "Không tìm thấy gói đã xóa" : "Thùng rác đang trống"}
          description={
            hasSearch
              ? "Hãy thử tìm bằng tên hoặc mã gói khác."
              : "Các gói dịch vụ bị xóa sẽ xuất hiện tại đây."
          }
          framed={false}
          className="px-5"
        />
      ) : (
        <ul className="divide-y divide-[var(--c-line)]">
          {packages.map((pkg) => {
            const deletedAt = formatDeletedAt(pkg.deletedAt);
            const isRestoring = restoringId === pkg.id;

            return (
              <li
                key={pkg.id}
                className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-[var(--c-card-2)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] text-[var(--c-muted)]">
                    <Package className="size-4.5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-bold text-[var(--c-ink)]">
                        {pkg.name}
                      </p>
                      <span className="rounded-md bg-[var(--c-primary-soft)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--c-primary-strong)]">
                        {pkg.packageCode}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--c-muted)]">
                      <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
                      {deletedAt ? `Đã xóa lúc ${deletedAt}` : "Không có thời gian xóa"}
                    </p>
                  </div>
                </div>

                <AdminButton
                  variant="secondary"
                  size="md"
                  icon={
                    isRestoring ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <RotateCcw className="size-3.5" aria-hidden="true" />
                    )
                  }
                  onClick={() => handleRestore(pkg.id)}
                  disabled={isRestoring || restoreMutation.isPending}
                  className="w-full shrink-0 sm:w-auto"
                >
                  {isRestoring ? "Đang khôi phục…" : "Khôi phục"}
                </AdminButton>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
