"use client";

import { CalendarDays, Eye, Tag, UserRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminBlogPreview } from "../hooks/useBlog";
import { formatDate, getBlogAuthorName, getBlogCategoryName, getBlogThumbnail } from "../utils/blog-format";
import { renderBlogContent } from "../utils/blog-content";

type BlogPreviewDialogProps = {
  blogId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BlogPreviewDialog({ blogId, open, onOpenChange }: BlogPreviewDialogProps) {
  const { data: blog, isLoading } = useAdminBlogPreview(open ? blogId : undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="cz-admin max-h-[92vh] overflow-y-auto bg-[var(--c-card)] p-0 sm:max-w-4xl">
        <DialogHeader className="border-b border-[var(--c-line)] px-5 py-4">
          <DialogTitle>Preview bài viết</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-4 p-5">
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-28 w-full" />
          </div>
        )}

        {!isLoading && blog && (
          <article>
            <div className="aspect-[16/7] max-h-[360px] overflow-hidden bg-[var(--c-soft)]">
              <img src={getBlogThumbnail(blog)} alt={blog.title} className="h-full w-full object-cover" />
            </div>
            <div className="space-y-5 px-5 py-6">
              <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--c-muted)]">
                <span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" />{getBlogCategoryName(blog)}</span>
                <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{blog.view_count} lượt xem</span>
                <span className="flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{getBlogAuthorName(blog)}</span>
                <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(blog.published_at)}</span>
              </div>
              <h1 className="text-3xl font-black leading-tight text-[var(--c-ink)]">{blog.title}</h1>
              {blog.summary && <p className="border-l-4 border-[var(--c-primary)] pl-4 text-[var(--c-muted)]">{blog.summary}</p>}
              <div
                className="blog-content space-y-4 text-[15px] leading-8 text-[var(--c-ink)]"
                dangerouslySetInnerHTML={{ __html: renderBlogContent(blog.content) }}
              />
            </div>
          </article>
        )}
      </DialogContent>
    </Dialog>
  );
}
