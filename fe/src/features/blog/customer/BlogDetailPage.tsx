"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Eye, Tag, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublishedBlogBySlug } from "../hooks/useBlog";
import {
  formatDate,
  getBlogAuthorName,
  getBlogCategoryName,
  getBlogThumbnail,
} from "../utils/blog-format";
import { renderBlogContent } from "../utils/blog-content";

export function BlogDetailPage() {
  const { id: slug } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: blog, isLoading, isError } = usePublishedBlogBySlug(slug);
  const contentHtml = useMemo(() => renderBlogContent(blog?.content ?? ""), [blog?.content]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[var(--c-bg)]">
        <Skeleton className="h-80 w-full rounded-none" />
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </div>
      </main>
    );
  }

  if (isError || !blog) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--c-bg)] px-4 text-center">
        <h1 className="text-xl font-bold text-[var(--c-ink)]">Không tìm thấy bài viết</h1>
        <p className="mt-2 max-w-sm text-sm text-[var(--c-muted)]">
          Bài viết không tồn tại hoặc chưa được xuất bản.
        </p>
        <Button className="mt-5" onClick={() => router.back()}>
          Quay lại
        </Button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--c-bg)] pb-16">
      <section className="relative">
        <div className="aspect-[16/9] max-h-[460px] overflow-hidden bg-[var(--c-soft)]">
          <img src={getBlogThumbnail(blog)} alt={blog.title} className="h-full w-full object-cover" />
        </div>
        <Button
          size="icon"
          variant="secondary"
          className="absolute left-4 top-4 rounded-full bg-white/90 backdrop-blur"
          onClick={() => router.back()}
          aria-label="Quay lại"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </section>

      <article className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-[var(--c-muted)]">
          <span className="flex items-center gap-1">
            <Tag className="h-3.5 w-3.5" />
            {getBlogCategoryName(blog)}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {blog.view_count} lượt xem
          </span>
        </div>

        <h1 className="text-3xl font-black leading-tight tracking-tight text-[var(--c-ink)] md:text-4xl">{blog.title}</h1>
        {blog.summary && (
          <p className="mt-4 border-l-4 border-[var(--c-primary)] pl-4 text-base leading-relaxed text-[var(--c-muted)]">
            {blog.summary}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-4 border-y border-[var(--c-line)] py-3 text-sm text-[var(--c-muted)]">
          <span className="flex items-center gap-1.5">
            <UserRound className="h-4 w-4" />
            {getBlogAuthorName(blog)}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {formatDate(blog.published_at)}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {blog.tags.map((tag) => (
            <span key={tag} className="rounded-md bg-[var(--c-soft)] px-2.5 py-1 text-xs text-[var(--c-muted)]">
              #{tag}
            </span>
          ))}
        </div>

        <div
          className="blog-content mt-8 space-y-4 text-[15px] leading-8 text-[var(--c-ink)]"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </article>
    </main>
  );
}
