"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BookOpenText, CalendarDays, Eye, Search, Tag, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/constants/routes";
import { usePublishedBlogs, usePublicBlogCategories, usePublicBlogTags } from "../hooks/useBlog";
import {
  formatDate,
  getBlogAuthorName,
  getBlogCategoryName,
  getBlogThumbnail,
} from "../utils/blog-format";

export function BlogListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const q = sp.get("q") ?? "";
  const categoryId = sp.get("category_id") ?? "";
  const tag = sp.get("tag") ?? "";

  const setParams = (updates: Record<string, string | undefined>, resetPage = true) => {
    const next = new URLSearchParams(sp.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) next.delete(key);
      else next.set(key, value);
    });
    if (resetPage) next.delete("page");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const { data, isLoading, isError, refetch } = usePublishedBlogs({ page, limit: 9, q, category_id: categoryId, tag });
  const { data: categories = [] } = usePublicBlogCategories();
  const { data: tags = [] } = usePublicBlogTags();
  const blogs = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  return (
    <main className="min-h-screen bg-[var(--c-bg)] pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:pb-16">
      <section className="border-b border-[var(--c-line)] bg-[var(--c-card)]">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--c-primary-soft)] px-3 py-1 text-xs font-bold text-[var(--c-primary-strong)]">
            <BookOpenText className="h-3.5 w-3.5" />
            Blog CleanZ
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--c-ink)]">
            Bài viết dành cho khách hàng
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--c-muted)]">
            Cập nhật mẹo chăm sóc nhà cửa, hướng dẫn sử dụng dịch vụ và tin tức từ CleanZ.
          </p>
        </div>
      </section>

      <div className="sticky top-0 z-20 border-b border-[var(--c-line)] bg-[var(--c-bg)]/95 backdrop-blur">
        <div className="mx-auto max-w-6xl space-y-3 px-4 py-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--c-muted)]" />
            <Input
              value={q}
              onChange={(event) => setParams({ q: event.target.value })}
              placeholder="Tìm bài viết..."
              className="h-10 rounded-lg pl-9 pr-9"
            />
            {q && (
              <button
                type="button"
                onClick={() => setParams({ q: undefined })}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--c-muted)] hover:bg-[var(--c-card)]"
                aria-label="Xóa tìm kiếm"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-nowrap overflow-x-auto gap-2 py-2 no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Button
              size="sm"
              variant={!categoryId ? "default" : "outline"}
              onClick={() => setParams({ category_id: undefined })}
              className="whitespace-nowrap shrink-0"
            >
              Tất cả danh mục
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                size="sm"
                variant={categoryId === category.id ? "default" : "outline"}
                onClick={() => setParams({ category_id: category.id })}
                className="whitespace-nowrap shrink-0"
              >
                {category.name}
              </Button>
            ))}
          </div>

          {tags.length > 0 && (
            <div className="flex flex-nowrap overflow-x-auto gap-2 py-2 no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Button
                size="sm"
                variant={!tag ? "default" : "outline"}
                onClick={() => setParams({ tag: undefined })}
                className="whitespace-nowrap shrink-0"
              >
                Tất cả thẻ
              </Button>
              {tags.map((item) => (
                <Button
                  key={item.id}
                  size="sm"
                  variant={tag === item.slug ? "default" : "outline"}
                  onClick={() => setParams({ tag: item.slug })}
                  className="whitespace-nowrap shrink-0"
                >
                  #{item.name}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-6">
        {isLoading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-80 rounded-lg" />
            ))}
          </div>
        )}

        {isError && !isLoading && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-10 text-center">
            <p className="font-semibold text-red-700">Không thể tải danh sách blog.</p>
            <Button className="mt-4" variant="outline" onClick={() => refetch()}>
              Thử lại
            </Button>
          </div>
        )}

        {!isLoading && !isError && blogs.length === 0 && (
          <div className="rounded-lg border border-[var(--c-line)] bg-[var(--c-card)] px-4 py-16 text-center">
            <BookOpenText className="mx-auto mb-3 h-10 w-10 text-[var(--c-muted)]" />
            <h2 className="text-lg font-bold text-[var(--c-ink)]">Chưa có bài viết phù hợp</h2>
            <p className="mt-1 text-sm text-[var(--c-muted)]">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc.</p>
          </div>
        )}

        {!isLoading && !isError && blogs.length > 0 && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {blogs.map((blog) => (
                <Link
                  key={blog.id}
                  href={ROUTES.CUSTOMER.BLOG_DETAIL(blog.slug)}
                  className="group overflow-hidden rounded-lg border border-[var(--c-line)] bg-[var(--c-card)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-[var(--c-soft)]">
                    <img
                      src={getBlogThumbnail(blog)}
                      alt={blog.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-2 text-xs text-[var(--c-muted)]">
                      <span className="flex items-center gap-1">
                        <Tag className="h-3.5 w-3.5" />
                        {getBlogCategoryName(blog)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        {blog.view_count}
                      </span>
                    </div>
                    <div>
                      <h2 className="line-clamp-2 text-lg font-bold leading-snug text-[var(--c-ink)]">{blog.title}</h2>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--c-muted)]">
                        {blog.summary || "Bài viết từ CleanZ."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {blog.tags.slice(0, 3).map((tagName) => (
                        <span key={tagName} className="rounded-md bg-[var(--c-soft)] px-2 py-1 text-[11px] text-[var(--c-muted)]">
                          #{tagName}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-[var(--c-line)] pt-3 text-xs text-[var(--c-muted)]">
                      <span className="flex items-center gap-1">
                        <UserRound className="h-3.5 w-3.5" />
                        {getBlogAuthorName(blog)}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(blog.published_at)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button variant="outline" disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) }, false)}>
                  Trước
                </Button>
                <span className="text-sm font-semibold text-[var(--c-muted)]">Trang {page}/{totalPages}</span>
                <Button variant="outline" disabled={page >= totalPages} onClick={() => setParams({ page: String(page + 1) }, false)}>
                  Sau
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
