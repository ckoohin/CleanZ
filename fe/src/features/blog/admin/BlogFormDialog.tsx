"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ui/image-upload";
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
import { BlogCategorySelect } from "./BlogCategorySelect";

const BLOG_UPLOAD_FOLDER = "CleanZ/blog";
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
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const saveMutation = useSaveBlog();
  const dateValue = useMemo(() => toDateTimeInputValue(form.published_at), [form.published_at]);
  const isEditing = Boolean(blog?.id);
  const isSubmitting = saveMutation.isPending || isUploadingThumbnail;

  const update = <K extends keyof BlogFormInput>(key: K, value: BlogFormInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleTitleChange = (title: string) => {
    setForm((current) => ({ ...current, title, slug: current.slug || slugify(title) }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

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

        </DialogDescription>
      </DialogHeader>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="blog-title">Tiêu đề</Label>
            <Input id="blog-title" value={form.title} onChange={(event) => handleTitleChange(event.target.value)} required disabled={isSubmitting} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="blog-slug">Đường dẫn</Label>
            <Input id="blog-slug" value={form.slug} onChange={(event) => update("slug", slugify(event.target.value))} required disabled={isSubmitting} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="blog-summary">Tóm tắt</Label>
          <Textarea id="blog-summary" value={form.summary} onChange={(event) => update("summary", event.target.value)} rows={3} disabled={isSubmitting} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="blog-content">Nội dung</Label>
          <Textarea id="blog-content" value={form.content} onChange={(event) => update("content", event.target.value)} rows={10} required disabled={isSubmitting} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Ảnh đại diện</Label>
            <ImageUpload
              value={form.thumbnail_url}
              onChange={(url) => update("thumbnail_url", url)}
              onRemove={() => update("thumbnail_url", "")}
              disabled={saveMutation.isPending}
              folder={BLOG_UPLOAD_FOLDER}
              onUploadingChange={setIsUploadingThumbnail}
              onUploadError={() => toast.error("Tải ảnh đại diện thất bại. Vui lòng thử lại.")}
            />
          </div>
          <div className="space-y-2">
            <Label>Danh mục</Label>
            <BlogCategorySelect value={form.category_id} onChange={(categoryId) => update("category_id", categoryId)} disabled={isSubmitting} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="blog-tags">Thẻ</Label>
            <Input id="blog-tags" value={tagInput} onChange={(event) => setTagInput(event.target.value)} placeholder="Ví dụ: vệ sinh, mẹo hay" disabled={isSubmitting} />
          </div>
          <div className="space-y-2">
            <Label>Trạng thái</Label>
            <Select value={form.status} onValueChange={(value) => update("status", value as BlogStatus)} disabled={isSubmitting}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="blog-published-at">Ngày xuất bản</Label>
          <Input id="blog-published-at" type="datetime-local" value={dateValue} onChange={(event) => update("published_at", fromDateTimeInputValue(event.target.value))} disabled={isSubmitting} />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Hủy</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
