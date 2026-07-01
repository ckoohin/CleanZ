"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSaveBlog } from "../hooks/useBlog";
import type { BlogFormInput, BlogPost, BlogStatus } from "../types/blog.types";
import { fromDateTimeInputValue, toDateTimeInputValue } from "../utils/blog-format";

const STATUS_OPTIONS: BlogStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];
const STATUS_LABELS: Record<BlogStatus, string> = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đã xuất bản",
  ARCHIVED: "Đã lưu trữ",
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getInitialForm(blog?: BlogPost | null): BlogFormInput {
  return {
    title: blog?.title ?? "",
    slug: blog?.slug ?? "",
    summary: blog?.summary ?? "",
    content: blog?.content ?? "",
    thumbnail_url: blog?.thumbnail_url ?? "",
    category_id: blog?.category_id ?? "",
    tags: blog?.tags ?? [],
    status: blog?.status ?? "DRAFT",
    published_at: blog?.published_at ?? null,
  };
}

function BlogFormBody({
  blog,
  onOpenChange,
}: {
  blog?: BlogPost | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<BlogFormInput>(() => getInitialForm(blog));
  const [tagInput, setTagInput] = useState(() => (blog?.tags ?? []).join(", "));
  const saveMutation = useSaveBlog();
  const dateValue = useMemo(() => toDateTimeInputValue(form.published_at), [form.published_at]);
  const isEditing = Boolean(blog?.id);

  const update = <K extends keyof BlogFormInput>(key: K, value: BlogFormInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleTitleChange = (title: string) => {
    setForm((current) => ({ ...current, title, slug: current.slug || slugify(title) }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const tags = tagInput.split(",").map((tag) => tag.trim()).filter(Boolean);
    saveMutation.mutate(
      {
        id: blog?.id,
        data: {
          ...form,
          category_id: form.category_id || undefined,
          thumbnail_url: form.thumbnail_url || undefined,
          summary: form.summary || undefined,
          tags,
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>{isEditing ? "Sửa bài viết" : "Thêm bài viết"}</DialogTitle>
        <DialogDescription>
          Quản lý nội dung blog. Category hiện dùng `category_id` vì backend chưa có API quản lý category.
        </DialogDescription>
      </DialogHeader>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="blog-title">Tiêu đề</Label>
            <Input id="blog-title" value={form.title} onChange={(event) => handleTitleChange(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="blog-slug">Đường dẫn</Label>
            <Input id="blog-slug" value={form.slug} onChange={(event) => update("slug", slugify(event.target.value))} required />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="blog-summary">Tóm tắt</Label>
          <Textarea id="blog-summary" value={form.summary} onChange={(event) => update("summary", event.target.value)} rows={3} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="blog-content">Nội dung</Label>
          <Textarea id="blog-content" value={form.content} onChange={(event) => update("content", event.target.value)} rows={10} required />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="blog-thumbnail">Ảnh đại diện</Label>
            <Input id="blog-thumbnail" value={form.thumbnail_url} onChange={(event) => update("thumbnail_url", event.target.value)} placeholder="Nhập đường dẫn ảnh đại diện" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="blog-category-id">Danh mục</Label>
            <Input id="blog-category-id" value={form.category_id} onChange={(event) => update("category_id", event.target.value)} placeholder="Nhập mã danh mục (nếu có)" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="blog-tags">Thẻ</Label>
            <Input id="blog-tags" value={tagInput} onChange={(event) => setTagInput(event.target.value)} placeholder="Ví dụ: vệ sinh, mẹo hay" />
          </div>
          <div className="space-y-2">
            <Label>Trạng thái</Label>
            <Select value={form.status} onValueChange={(value) => update("status", value as BlogStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="blog-published-at">Ngày xuất bản</Label>
          <Input id="blog-published-at" type="datetime-local" value={dateValue} onChange={(event) => update("published_at", fromDateTimeInputValue(event.target.value))} />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export function BlogFormDialog({
  open,
  onOpenChange,
  blog,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blog?: BlogPost | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <BlogFormBody key={blog?.id ?? "new"} blog={blog} onOpenChange={onOpenChange} />}
    </Dialog>
  );
}
