import type { BlogPost } from "../types/blog.types";

export function getBlogThumbnail(blog: BlogPost): string {
  return blog.thumbnail_url || "/images/partner-hero.png";
}

export function getBlogCategoryName(blog: BlogPost): string {
  return blog.category?.name || "Chưa phân loại";
}

export function getBlogAuthorName(blog: BlogPost): string {
  return blog.author?.fullName || blog.author?.email || "CleanZ";
}

export function formatDate(date?: string | null): string {
  if (!date) return "Chưa xuất bản";
  return new Date(date).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function toDateTimeInputValue(date?: string | null): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function fromDateTimeInputValue(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}
