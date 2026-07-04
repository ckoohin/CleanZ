export type BlogStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  blog_count?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
}

export interface BlogAuthor {
  id: string;
  fullName: string;
  email: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  thumbnail_url: string | null;
  category_id: string | null;
  category: BlogCategory | null;
  tags: string[];
  author: BlogAuthor | null;
  status: BlogStatus;
  view_count: number;
  published_at: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogListParams {
  page?: number;
  limit?: number;
  q?: string;
  category_id?: string;
  tag?: string;
  status?: BlogStatus;
}

export interface BlogListResponse {
  data: BlogPost[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface BlogFormInput {
  title: string;
  slug: string;
  summary?: string;
  content: string;
  thumbnail_url?: string;
  category_id?: string;
  tags?: string[];
  status: BlogStatus;
  published_at?: string | null;
}

export interface BlogCategoryFormInput {
  name: string;
  slug: string;
  description?: string | null;
}
