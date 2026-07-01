"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BookOpenText, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BaseTableList, type Column, type RowAction } from "@/components/ui/base/base_table_list";
import { ROUTES } from "@/constants/routes";
import { useAdminBlogs, useChangeBlogStatus, useDeleteBlog } from "../hooks/useBlog";
import type { BlogPost, BlogStatus } from "../types/blog.types";
import { formatDate, getBlogAuthorName, getBlogCategoryName, getBlogThumbnail } from "../utils/blog-format";
import { BlogFormDialog } from "./BlogFormDialog";

const STATUS_OPTIONS: BlogStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];
const STATUS_LABELS: Record<BlogStatus, string> = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đã xuất bản",
  ARCHIVED: "Đã lưu trữ",
};

export function AdminBlogPage() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [showForm, setShowForm] = useState(false);

  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const limit = Math.max(1, Number(sp.get("limit") ?? 10));
  const q = sp.get("q") ?? "";
  const status = sp.get("status") as BlogStatus | null;

  const setParams = useCallback((updates: Record<string, string | undefined>, resetPage = true) => {
    const next = new URLSearchParams(sp.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === "ALL") next.delete(key);
      else next.set(key, value);
    });
    if (resetPage) next.delete("page");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [pathname, router, sp]);

  const { data, isLoading } = useAdminBlogs({ page, limit, q, status: status || undefined });
  const deleteMutation = useDeleteBlog();
  const statusMutation = useChangeBlogStatus();

  const openCreate = () => {
    setEditingBlog(null);
    setShowForm(true);
  };

  const openEdit = (blog: BlogPost) => {
    setEditingBlog(blog);
    setShowForm(true);
  };

  const handleDelete = (blog: BlogPost) => {
    if (!window.confirm(`Xóa bài viết "${blog.title}"?`)) return;
    deleteMutation.mutate(blog.id);
  };

  const columns: Column<BlogPost>[] = [
    {
      key: "title",
      title: "Bài viết",
      render: (blog) => (
        <div className="flex min-w-[280px] items-center gap-3">
          <img src={getBlogThumbnail(blog)} alt="" className="h-12 w-16 rounded-md object-cover" />
          <div className="min-w-0">
            <p className="line-clamp-1 font-bold text-[var(--c-ink)]">{blog.title}</p>
            <p className="line-clamp-1 text-xs text-[var(--c-muted)]">{blog.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      title: "Danh mục",
      hideOnMobile: true,
      render: (blog) => <span className="text-xs text-[var(--c-muted)]">{getBlogCategoryName(blog)}</span>,
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (blog) => (
        <Select value={blog.status} onValueChange={(value) => statusMutation.mutate({ id: blog.id, status: value as BlogStatus })}>
          <SelectTrigger className="h-8 w-[132px] rounded-lg"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((item) => <SelectItem key={item} value={item}>{STATUS_LABELS[item]}</SelectItem>)}
          </SelectContent>
        </Select>
      ),
    },
    { key: "view_count", title: "Lượt xem", hideOnMobile: true, render: (blog) => <span className="text-xs font-semibold">{blog.view_count}</span> },
    { key: "author", title: "Tác giả", hideOnMobile: true, render: (blog) => <span className="text-xs text-[var(--c-muted)]">{getBlogAuthorName(blog)}</span> },
    { key: "published_at", title: "Xuất bản", hideOnMobile: true, render: (blog) => <span className="text-xs text-[var(--c-muted)]">{formatDate(blog.published_at)}</span> },
  ];

  const rowActions: RowAction<BlogPost>[] = [
    {
      type: "view",
      label: "Xem trang khách hàng",
      icon: Eye,
      hidden: (blog) => blog.status !== "PUBLISHED",
      onClick: (blog) => window.open(ROUTES.CUSTOMER.BLOG_DETAIL(blog.id), "_blank"),
    },
    { type: "edit", label: "Sửa", icon: Pencil, onClick: openEdit },
    { type: "delete", label: "Xóa", icon: Trash2, variant: "destructive", onClick: handleDelete },
  ];

  const filters = (
    <Select value={status || "ALL"} onValueChange={(value) => setParams({ status: value })}>
      <SelectTrigger className="h-9 w-full rounded-lg sm:w-40"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">Tất cả</SelectItem>
        {STATUS_OPTIONS.map((item) => <SelectItem key={item} value={item}>{STATUS_LABELS[item]}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  return (
    <main className="min-h-screen py-6">
      <div className="space-y-6">
        <PageHeader
          title="Quản lý blog"
          description="Tạo, chỉnh sửa, xuất bản và lưu trữ bài viết hiển thị cho khách hàng CleanZ."
        />

        <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-3 shadow-sm sm:p-4">
          <div className="mb-4 flex flex-col gap-3 border-b border-[var(--c-line)] pb-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)]">
                <BookOpenText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--c-ink)]">Danh sách blog</h2>
                <p className="text-xs text-[var(--c-muted)]">{data?.meta.total ?? 0} bài viết</p>
              </div>
            </div>
            <Button className="gap-2 sm:ml-auto" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Thêm blog
            </Button>
          </div>

          <BaseTableList
            columns={columns}
            data={data?.data ?? []}
            rowKey="id"
            totalItems={data?.meta.total ?? 0}
            page={page}
            limit={limit}
            onPageChange={(nextPage) => setParams({ page: String(nextPage) }, false)}
            onLimitChange={(nextLimit) => setParams({ limit: String(nextLimit) })}
            keyword={q}
            onKeywordChange={(keyword) => setParams({ q: keyword })}
            placeholderSearch="Tìm tiêu đề, đường dẫn, tóm tắt..."
            filters={filters}
            isLoading={isLoading}
            emptyTitle="Chưa có bài viết"
            emptyDescription="Tạo bài viết đầu tiên để hiển thị trên khu vực customer."
            emptyIcon={BookOpenText}
            rowActions={rowActions}
            inlineActionCount={3}
          />
        </div>
      </div>

      <BlogFormDialog open={showForm} onOpenChange={setShowForm} blog={editingBlog} />
    </main>
  );
}
