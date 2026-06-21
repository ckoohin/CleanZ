"use client";

import React, { useState } from "react";
import { Plus, CalendarDays, Loader2, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";

import { BaseButton } from "@/components/ui/base/base_button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  usePeakDays,
  useDeletePeakDay,
  useUpdatePeakDay,
} from "@/features/admin/hooks/useAdminPricing";
import { PeakDayConfigEntity } from "@/features/admin/services/admin-pricing.service";
import { PeakDayModal } from "@/features/admin/components/settings/PeakDayModal";
import BaseEmptyState from "@/components/ui/base/base_empty_state";

export default function AdminPeakDaysPage() {
  const { data: peakDays, isLoading } = usePeakDays();
  const deleteMutation = useDeletePeakDay();
  const updateMutation = useUpdatePeakDay();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PeakDayConfigEntity | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: PeakDayConfigEntity) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteMutation.mutate(deletingId, {
      onSuccess: () => setDeletingId(null),
    });
  };

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    updateMutation.mutate({ id, payload: { isActive: !currentStatus } });
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-primary" />
            Cấu hình Ngày cao điểm
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Thiết lập phụ thu cho Lễ, Tết hoặc khung giờ cao điểm trên toàn hệ thống.
          </p>
        </div>
        <BaseButton
          variant="primary"
          onClick={handleCreate}
          className="rounded-xl shadow-lg shadow-primary/20 gap-2 h-11 px-6"
        >
          <Plus className="w-4 h-4" />
          <span className="font-bold uppercase tracking-widest text-[10px]">Thêm Ngày</span>
        </BaseButton>
      </div>

      <div className="bg-card border border-border/50 shadow-sm rounded-3xl overflow-hidden">
        {isLoading ? (
          <div className="flex h-[300px] items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : !peakDays || peakDays.length === 0 ? (
          <div className="py-20">
            <BaseEmptyState
              title="Chưa có cấu hình"
              description="Hệ thống chưa có ngày cao điểm nào được thiết lập."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-6 py-4 font-bold">Tên cấu hình</th>
                  <th className="px-6 py-4 font-bold">Thời gian áp dụng</th>
                  <th className="px-6 py-4 font-bold">Khung giờ</th>
                  <th className="px-6 py-4 font-bold">Tỉ lệ phụ thu</th>
                  <th className="px-6 py-4 font-bold text-center">Trạng thái</th>
                  <th className="px-6 py-4 font-bold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {peakDays.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-foreground">{item.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {item.startAt && item.endAt ? (
                        <>
                          <span className="text-foreground font-medium">{format(new Date(item.startAt), "dd/MM/yyyy")}</span>
                          {" - "}
                          <span className="text-foreground font-medium">{format(new Date(item.endAt), "dd/MM/yyyy")}</span>
                        </>
                      ) : (
                        <span className="italic">Không giới hạn ngày</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {item.startTime && item.endTime ? (
                        <span className="font-mono bg-muted px-2 py-1 rounded text-foreground text-xs">
                          {item.startTime} - {item.endTime}
                        </span>
                      ) : (
                        <span className="italic">Cả ngày</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                        + {(item.peakRate * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Switch
                        checked={item.isActive}
                        onCheckedChange={() => handleToggleActive(item.id, item.isActive)}
                        disabled={updateMutation.isPending}
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <BaseButton
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(item)}
                          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <Edit className="w-4 h-4" />
                        </BaseButton>
                        <BaseButton
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingId(item.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </BaseButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PeakDayModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        initialData={editingItem}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Bạn có chắc chắn muốn xóa cấu hình ngày cao điểm này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="h-11 rounded-xl font-bold">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Đang xóa..." : "Xóa vĩnh viễn"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
