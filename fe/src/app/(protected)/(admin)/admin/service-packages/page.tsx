"use client";

import React, { useState } from "react";
import { Plus, Edit2, Trash2, Loader2, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";

import { BaseTableList, Column, RowAction } from "@/components/ui/base/base_table_list";
import { BaseButton } from "@/components/ui/base/base_button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  useAdminPackages,
  useCreateAdminPackage,
  useUpdateAdminPackage,
  useDeleteAdminPackage,
} from "@/features/admin/modules/service/hooks/useAdminServices";
import { AdminServicePackageEntity } from "@/features/admin/modules/service/services/admin-services.service";

export default function AdminCategoriesPage() {
  const { data: packages = [], isLoading } = useAdminPackages();
  
  const createMutation = useCreateAdminPackage();
  const updateMutation = useUpdateAdminPackage();
  const deleteMutation = useDeleteAdminPackage();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<AdminServicePackageEntity | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    packageCode: "",
    iconUrl: "",
    sortOrder: 0,
    isActive: true,
    maxHours: 8.0,
    nightSurcharge: 0,
    petSurcharge: 0,
    waitingSurcharge: 0,
    toolFee: 0,
    peakRatePercent: 0,
  });

  const filteredPackages = packages.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleOpenCreateModal = () => {
    setEditingPackage(null);
    setFormData({ 
      name: "", 
      packageCode: "", 
      iconUrl: "", 
      sortOrder: 0, 
      isActive: true,
      maxHours: 8.0,
      nightSurcharge: 0,
      petSurcharge: 0,
      waitingSurcharge: 0,
      toolFee: 0,
      peakRatePercent: 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (pkg: AdminServicePackageEntity) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      packageCode: pkg.packageCode,
      iconUrl: pkg.iconUrl || "",
      sortOrder: pkg.sortOrder,
      isActive: pkg.isActive,
      maxHours: Number(pkg.maxHours),
      nightSurcharge: Number(pkg.nightSurcharge),
      petSurcharge: Number(pkg.petSurcharge),
      waitingSurcharge: Number(pkg.waitingSurcharge),
      toolFee: Number(pkg.toolFee),
      peakRatePercent: Number(pkg.peakRatePercent),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPackage) {
      updateMutation.mutate({ id: editingPackage.id, payload: formData }, {
        onSuccess: () => setIsModalOpen(false)
      });
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => setIsModalOpen(false)
      });
    }
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteMutation.mutate(deletingId, {
      onSuccess: () => setDeletingId(null),
    });
  };

  const columns: Column<AdminServicePackageEntity>[] = [
    {
      key: "name",
      title: "Gói dịch vụ",
      render: (row) => (
        <div className="flex items-center gap-4">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-muted/30">
            {row.iconUrl ? (
              <Image src={row.iconUrl} alt={row.name} fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ImageIcon className="w-5 h-5 opacity-50" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-bold text-base text-foreground">{row.name}</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/10 text-primary w-fit">{row.packageCode}</span>
          </div>
        </div>
      ),
    },
    {
      key: "maxHours",
      title: "Giờ tối đa",
      render: (row) => <Badge variant="secondary">{row.maxHours}h</Badge>,
    },
    {
      key: "isActive",
      title: "Trạng thái",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={row.isActive}
            onCheckedChange={(checked) => {
              updateMutation.mutate({ id: row.id, payload: { isActive: checked } });
            }}
          />
          <span className={`text-xs font-medium ${row.isActive ? 'text-emerald-600' : 'text-muted-foreground'}`}>
            {row.isActive ? "Bật" : "Tắt"}
          </span>
        </div>
      ),
    },
    {
      key: "createdAt",
      title: "Ngày tạo",
      render: (row) => (
        <span className="text-muted-foreground text-sm">
          {format(new Date(row.createdAt), "dd/MM/yyyy")}
        </span>
      ),
    },
  ];

  const rowActions: RowAction<AdminServicePackageEntity>[] = [
    {
      type: "edit",
      label: "Chỉnh sửa",
      onClick: handleOpenEditModal,
    },
    {
      type: "delete",
      label: "Xóa",
      onClick: (row) => setDeletingId(row.id),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Quản lý Gói Dịch Vụ
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Thiết lập các gói dịch vụ lớn (VD: Dọn dẹp nhà cửa, Tổng vệ sinh...) và cấu hình các loại phụ phí.
          </p>
        </div>
        <BaseButton
          variant="primary"
          onClick={handleOpenCreateModal}
          className="rounded-xl shadow-lg shadow-primary/20 gap-2 h-11 px-6"
        >
          <Plus className="w-4 h-4" />
          <span className="font-bold uppercase tracking-widest text-[10px]">Thêm Gói Mới</span>
        </BaseButton>
      </div>

      <div className="bg-card border border-border/50 shadow-sm rounded-3xl p-6">
        <BaseTableList
          columns={columns}
          data={filteredPackages}
          rowKey="id"
          totalItems={filteredPackages.length}
          page={1}
          limit={100}
          onPageChange={() => {}}
          onLimitChange={() => {}}
          keyword={searchTerm}
          onKeywordChange={setSearchTerm}
          placeholderSearch="Tìm kiếm theo tên gói dịch vụ..."
          rowActions={rowActions}
          isLoading={isLoading}
        />
      </div>

      {/* Delete Modal */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa gói dịch vụ này? Các dịch vụ con liên kết có thể bị ảnh hưởng.
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

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-[2rem] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {editingPackage ? "Cập nhật gói dịch vụ" : "Thêm gói dịch vụ mới"}
              </DialogTitle>
              <DialogDescription>
                Thiết lập thông tin chung và cấu hình bảng phụ phí cho Gói.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="name" className="font-bold">Tên gói dịch vụ <span className="text-destructive">*</span></Label>
                  <Input
                    id="name"
                    placeholder="VD: Dọn dẹp nhà cửa"
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const packageCode = 'PKG-' + name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").toUpperCase();
                      setFormData({ ...formData, name, packageCode });
                    }}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="packageCode" className="font-bold">Mã gói dịch vụ</Label>
                  <Input
                    id="packageCode"
                    placeholder="vd: PKG-DON-DEP-NHA"
                    value={formData.packageCode}
                    onChange={(e) => setFormData({ ...formData, packageCode: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="iconUrl" className="font-bold">Ảnh mô tả (URL)</Label>
                  <Input
                    id="iconUrl"
                    placeholder="https://example.com/image.png"
                    value={formData.iconUrl}
                    onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
                  />
                </div>
              </div>

              <div className="h-px bg-border/60 my-2" />

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="maxHours" className="font-bold">Số giờ tối đa</Label>
                  <Input
                    id="maxHours"
                    type="number"
                    step="0.5"
                    value={formData.maxHours}
                    onChange={(e) => setFormData({ ...formData, maxHours: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="peakRatePercent" className="font-bold">% Phụ phí giờ cao điểm</Label>
                  <Input
                    id="peakRatePercent"
                    type="number"
                    value={formData.peakRatePercent}
                    onChange={(e) => setFormData({ ...formData, peakRatePercent: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="petSurcharge" className="font-bold">Phụ thu Thú cưng (VND)</Label>
                  <Input
                    id="petSurcharge"
                    type="number"
                    value={formData.petSurcharge}
                    onChange={(e) => setFormData({ ...formData, petSurcharge: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nightSurcharge" className="font-bold">Phụ thu Đêm/Sớm (VND)</Label>
                  <Input
                    id="nightSurcharge"
                    type="number"
                    value={formData.nightSurcharge}
                    onChange={(e) => setFormData({ ...formData, nightSurcharge: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="toolFee" className="font-bold">Phí Công cụ dụng cụ mang theo (VND)</Label>
                  <Input
                    id="toolFee"
                    type="number"
                    value={formData.toolFee}
                    onChange={(e) => setFormData({ ...formData, toolFee: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="waitingSurcharge" className="font-bold">Phụ thu Chờ làm (mỗi 15p - VND)</Label>
                  <Input
                    id="waitingSurcharge"
                    type="number"
                    value={formData.waitingSurcharge}
                    onChange={(e) => setFormData({ ...formData, waitingSurcharge: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="sortOrder" className="font-bold">Thứ tự hiển thị</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="font-bold">Trạng thái</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(c) => setFormData({ ...formData, isActive: c })}
                    />
                    <span className="text-sm">{formData.isActive ? "Kích hoạt" : "Tạm ẩn"}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter className="mt-4 border-t pt-4">
              <BaseButton type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Hủy bỏ
              </BaseButton>
              <BaseButton type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Lưu gói dịch vụ
              </BaseButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
