"use client";

import { FormEvent, useMemo, useState } from "react";
import { FolderPlus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/base/confirm_dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useAdminBlogCategories,
  useCreateBlogCategory,
  useDeleteBlogCategory,
  useUpdateBlogCategory,
} from "../hooks/useBlog";
import type { BlogCategory, BlogCategoryFormInput } from "../types/blog.types";

const emptyForm: BlogCategoryFormInput = {
  name: "",
  slug: "",
  description: "",
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function BlogCategoryManager() {
  const { data: categories = [], isLoading } = useAdminBlogCategories();
  const createMutation = useCreateBlogCategory();
  const updateMutation = useUpdateBlogCategory();
  const deleteMutation = useDeleteBlogCategory();
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<BlogCategory | null>(null);
  const [form, setForm] = useState<BlogCategoryFormInput>(emptyForm);
  const isPending = createMutation.isPending || updateMutation.isPending;

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name, "vi")),
    [categories],
  );

  const update = <K extends keyof BlogCategoryFormInput>(key: K, value: BlogCategoryFormInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleNameChange = (name: string) => {
    setForm((current) => ({ ...current, name, slug: current.slug || slugify(name) }));
  };

  const resetForm = () => {
    setEditingCategory(null);
    setForm(emptyForm);
  };

  const startEdit = (category: BlogCategory) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
    });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const payload: BlogCategoryFormInput = {
      name: form.name.trim(),
      slug: slugify(form.slug),
      description: form.description?.trim() || null,
    };

    if (editingCategory) {
      updateMutation.mutate(
        { id: editingCategory.id, data: payload },
        { onSuccess: resetForm },
      );
      return;
    }

    createMutation.mutate(payload, { onSuccess: resetForm });
  };

  const confirmDelete = () => {
    if (!deletingCategory) return;
    deleteMutation.mutate(deletingCategory.id, {
      onSuccess: () => setDeletingCategory(null),
    });
  };

  return (
    <section className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-3 shadow-sm sm:p-4">
      <div className="mb-4 flex items-center gap-3 border-b border-[var(--c-line)] pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)]">
          <FolderPlus className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--c-ink)]">Danh mục blog</h2>
          <p className="text-xs text-[var(--c-muted)]">Quản lý danh mục dùng trong form bài viết.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="overflow-x-auto overflow-hidden rounded-xl border border-[var(--c-line)] lg:col-span-2">
          <div className="min-w-[320px]">
            <div className="grid grid-cols-[1fr_80px_88px] sm:grid-cols-[1fr_120px_96px] gap-2 sm:gap-3 border-b border-[var(--c-line)] bg-[var(--c-card-2)] px-3 py-2 text-xs font-bold uppercase text-[var(--c-muted)]">
              <span>Tên danh mục</span>
              <span className="text-center sm:text-left">Bài viết</span>
              <span className="text-right">Thao tác</span>
            </div>
            <div className="divide-y divide-[var(--c-line)]">
              {isLoading && <div className="px-3 py-6 text-sm text-[var(--c-muted)]">Đang tải danh mục...</div>}
              {!isLoading && sortedCategories.length === 0 && (
                <div className="px-3 py-6 text-sm text-[var(--c-muted)]">Chưa có danh mục blog.</div>
              )}
              {sortedCategories.map((category) => (
                <div key={category.id} className="grid grid-cols-[1fr_80px_88px] sm:grid-cols-[1fr_120px_96px] items-center gap-2 sm:gap-3 px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--c-ink)]">{category.name}</p>
                    <p className="truncate text-xs text-[var(--c-muted)]">{category.slug}</p>
                  </div>
                  <span className="text-center sm:text-left text-sm text-[var(--c-muted)]">{category.blog_count ?? 0}</span>
                  <div className="flex justify-end gap-1">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(category)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingCategory(category)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <form className="space-y-3 rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-3 sm:p-4 lg:col-span-1" onSubmit={handleSubmit}>
          <div>
            <h3 className="text-sm font-bold text-[var(--c-ink)]">{editingCategory ? "Sửa danh mục" : "Thêm danh mục"}</h3>
            <p className="text-xs text-[var(--c-muted)]">Slug sẽ được chuẩn hóa trước khi lưu.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="blog-category-name">Tên danh mục</Label>
            <Input id="blog-category-name" value={form.name} onChange={(event) => handleNameChange(event.target.value)} required disabled={isPending} className="w-full" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="blog-category-slug">Đường dẫn</Label>
            <Input id="blog-category-slug" value={form.slug} onChange={(event) => update("slug", slugify(event.target.value))} required disabled={isPending} className="w-full" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="blog-category-description">Mô tả</Label>
            <Textarea id="blog-category-description" value={form.description || ""} onChange={(event) => update("description", event.target.value)} rows={3} disabled={isPending} className="w-full" />
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-1">
            {editingCategory && (
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={resetForm} disabled={isPending}>
                Hủy
              </Button>
            )}
            <Button type="submit" className="w-full sm:w-auto" disabled={isPending}>
              {editingCategory ? "Lưu danh mục" : "Thêm danh mục"}
            </Button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        isOpen={Boolean(deletingCategory)}
        onClose={() => setDeletingCategory(null)}
        onConfirm={confirmDelete}
        title="Xóa danh mục"
        description={deletingCategory ? `Bạn có chắc muốn xóa danh mục "${deletingCategory.name}"?` : ""}
        confirmLabel="Xóa danh mục"
        variant="destructive"
        isPending={deleteMutation.isPending}
      />
    </section>
  );
}
