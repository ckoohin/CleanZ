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
  useAdminCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  CategoryEntity,
} from "@/features/admin/hooks/useAdminCategories";

export default function AdminCategoriesPage() {
  const { data: categories, isLoading } = useAdminCategories();
  
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryEntity | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    iconUrl: "",
    sortOrder: 0,
    isActive: true,
  });

  const filteredCategories = categories?.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())) || [];

  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setFormData({ name: "", slug: "", iconUrl: "", sortOrder: 0, isActive: true });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: CategoryEntity) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      iconUrl: cat.iconUrl || "",
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, payload: formData }, {
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

  const columns: Column<CategoryEntity>[] = [
    {
      key: "name",
      title: "Danh mục",
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
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/10 text-primary w-fit">{row.slug}</span>
          </div>
        </div>
      ),
    },
    {
      key: "sortOrder",
      title: "Thứ tự",
      render: (row) => <Badge variant="outline">{row.sortOrder}</Badge>,
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

  const rowActions: RowAction<CategoryEntity>[] = [
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
            Quản lý Danh mục
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Thiết lập các danh mục gốc của dịch vụ (VD: Dọn dẹp, Sửa chữa...).
          </p>
        </div>
        <BaseButton
          variant="primary"
          onClick={handleOpenCreateModal}
          className="rounded-xl shadow-lg shadow-primary/20 gap-2 h-11 px-6"
        >
          <Plus className="w-4 h-4" />
          <span className="font-bold uppercase tracking-widest text-[10px]">Thêm Danh mục</span>
        </BaseButton>
      </div>

      <div className="bg-card border border-border/50 shadow-sm rounded-3xl p-6">
        <BaseTableList
          columns={columns}
          data={filteredCategories}
          rowKey="id"
          totalItems={filteredCategories.length}
          page={1}
          limit={100}
          onPageChange={() => {}}
          onLimitChange={() => {}}
          keyword={searchTerm}
          onKeywordChange={setSearchTerm}
          placeholderSearch="Tìm kiếm theo tên danh mục..."
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
              Bạn có chắc chắn muốn xóa danh mục này? Các dịch vụ thuộc danh mục này có thể bị ảnh hưởng.
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
        <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {editingCategory ? "Cập nhật danh mục" : "Thêm danh mục mới"}
              </DialogTitle>
              <DialogDescription>
                Nhập thông tin cơ bản để phân loại dịch vụ.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-6 py-6">
              <div className="grid gap-2">
                <Label htmlFor="name" className="font-bold">Tên danh mục <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  placeholder="VD: Dọn dẹp nhà"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
                    setFormData({ ...formData, name, slug });
                  }}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="slug" className="font-bold">Đường dẫn (Slug)</Label>
                <Input
                  id="slug"
                  placeholder="vd: don-dep-nha"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="sortOrder" className="font-bold">Thứ tự</Label>
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
                    <span className="text-sm">{formData.isActive ? "Hoạt động" : "Tạm ẩn"}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <BaseButton type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Hủy bỏ
              </BaseButton>
              <BaseButton type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Lưu danh mục
              </BaseButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
