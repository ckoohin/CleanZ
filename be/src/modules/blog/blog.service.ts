import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { PaginatedData } from '../../common/helpers/response.interface';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { CreateBlogDto } from './dto/create-blog.dto';
import { QueryBlogDto } from './dto/query-blog.dto';
import { UpdateBlogCategoryDto } from './dto/update-blog-category.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { BlogCategoryEntity } from './entity/blog-category.entity';
import { BlogTagRelationEntity } from './entity/blog-tag-relation.entity';
import { BlogTagEntity } from './entity/blog-tag.entity';
import { BlogEntity, BlogStatus } from './entity/blog.entity';
import { sanitizeBlogContent } from './utils/blog-content.util';

export interface BlogResponse {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  thumbnail_url: string | null;
  category_id: string | null;
  category: BlogCategoryEntity | null;
  tags: string[];
  author: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  status: BlogStatus;
  view_count: number;
  published_at: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BlogCategoryResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  blog_count?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BlogTagResponse {
  id: string;
  name: string;
  slug: string;
}

const MAX_BLOG_TAGS = 8;
const MAX_BLOG_TAG_LENGTH = 50;
const VIEW_COUNT_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class BlogService {
  private readonly recentViews = new Map<string, number>();

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(BlogEntity)
    private readonly blogRepo: Repository<BlogEntity>,
    @InjectRepository(BlogCategoryEntity)
    private readonly categoryRepo: Repository<BlogCategoryEntity>,
    @InjectRepository(BlogTagEntity)
    private readonly tagRepo: Repository<BlogTagEntity>,
    @InjectRepository(BlogTagRelationEntity)
    private readonly tagRelationRepo: Repository<BlogTagRelationEntity>,
  ) {}

  async findPublished(
    query: QueryBlogDto & { tag?: string },
  ): Promise<PaginatedData<BlogResponse>> {
    return this.findWithPagination({ ...query, status: BlogStatus.PUBLISHED });
  }

  async findPublishedOne(id: string): Promise<BlogResponse> {
    const blog = await this.findEntityById(id);
    if (blog.status !== BlogStatus.PUBLISHED) {
      throw new NotFoundException('BLOG_NOT_FOUND');
    }

    await this.recordView(blog);

    return this.toResponse(blog);
  }

  async findPublishedOneBySlug(
    slug: string,
    clientKey?: string,
  ): Promise<BlogResponse> {
    const blog = await this.findEntityBySlug(slug);
    if (blog.status !== BlogStatus.PUBLISHED) {
      throw new NotFoundException('BLOG_NOT_FOUND');
    }

    await this.recordView(blog, clientKey);

    return this.toResponse(blog);
  }

  async findOneForPreview(id: string): Promise<BlogResponse> {
    return this.findOneForAdmin(id);
  }

  async findAllForAdmin(
    query: QueryBlogDto,
  ): Promise<PaginatedData<BlogResponse>> {
    return this.findWithPagination(query);
  }

  async create(dto: CreateBlogDto, authorId?: string): Promise<BlogResponse> {
    const savedId = await this.dataSource.transaction(async (manager) => {
      const blogRepo = manager.getRepository(BlogEntity);

      await this.assertSlugAvailable(dto.slug, undefined, manager);
      await this.assertCategoryExists(dto.category_id, manager);

      const blog = blogRepo.create({
        title: dto.title,
        slug: this.normalizeSlug(dto.slug),
        summary: dto.summary ?? null,
        content: sanitizeBlogContent(dto.content),
        thumbnailUrl: dto.thumbnail_url ?? null,
        categoryId: dto.category_id ?? null,
        authorId: authorId ?? null,
        status: dto.status ?? BlogStatus.DRAFT,
        publishedAt: this.resolvePublishedAt(dto.status, dto.published_at),
      });

      const saved = await blogRepo.save(blog);
      await this.replaceTags(saved.id, dto.tags ?? [], manager);

      return saved.id;
    });

    return this.findOneForAdmin(savedId);
  }

  async update(id: string, dto: UpdateBlogDto): Promise<BlogResponse> {
    await this.dataSource.transaction(async (manager) => {
      const blogRepo = manager.getRepository(BlogEntity);
      const blog = await this.findEntityById(id, manager);

      if (dto.slug && this.normalizeSlug(dto.slug) !== blog.slug) {
        await this.assertSlugAvailable(dto.slug, id, manager);
        blog.slug = this.normalizeSlug(dto.slug);
      }

      await this.assertCategoryExists(dto.category_id, manager);

      blog.title = dto.title ?? blog.title;
      blog.summary = dto.summary !== undefined ? dto.summary : blog.summary;
      blog.content =
        dto.content !== undefined ? sanitizeBlogContent(dto.content) : blog.content;
      blog.thumbnailUrl =
        dto.thumbnail_url !== undefined ? dto.thumbnail_url : blog.thumbnailUrl;
      blog.categoryId =
        dto.category_id !== undefined ? dto.category_id : blog.categoryId;

      if (dto.status) {
        blog.status = dto.status;
      }

      if (dto.published_at !== undefined) {
        blog.publishedAt = dto.published_at ? new Date(dto.published_at) : null;
      } else if (dto.status === BlogStatus.PUBLISHED && !blog.publishedAt) {
        blog.publishedAt = new Date();
      }

      await blogRepo.save(blog);

      if (dto.tags !== undefined) {
        await this.replaceTags(id, dto.tags, manager);
      }
    });

    return this.findOneForAdmin(id);
  }

  async remove(id: string): Promise<void> {
    const blog = await this.findEntityById(id);
    await this.blogRepo.remove(blog);
  }

  async updateStatus(id: string, status: BlogStatus): Promise<BlogResponse> {
    const blog = await this.findEntityById(id);
    blog.status = status;
    if (status === BlogStatus.PUBLISHED && !blog.publishedAt) {
      blog.publishedAt = new Date();
    }
    await this.blogRepo.save(blog);
    return this.findOneForAdmin(id);
  }

  async findCategories(q?: string): Promise<BlogCategoryResponse[]> {
    const qb = this.categoryRepo
      .createQueryBuilder('category')
      .loadRelationCountAndMap('category.blogCount', 'category.blogs')
      .orderBy('category.name', 'ASC');

    if (q?.trim()) {
      qb.andWhere(
        '(LOWER(category.name) LIKE :keyword OR LOWER(category.slug) LIKE :keyword)',
        { keyword: `%${q.trim().toLowerCase()}%` },
      );
    }

    const categories = await qb.getMany();
    return categories.map((category) => this.toCategoryResponse(category));
  }

  async createCategory(
    dto: CreateBlogCategoryDto,
  ): Promise<BlogCategoryResponse> {
    const slug = this.normalizeSlug(dto.slug);
    await this.assertCategorySlugAvailable(slug);

    const category = await this.categoryRepo.save(
      this.categoryRepo.create({
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim() || null,
      }),
    );

    return this.toCategoryResponse(category);
  }

  async updateCategory(
    id: string,
    dto: UpdateBlogCategoryDto,
  ): Promise<BlogCategoryResponse> {
    const category = await this.findCategoryById(id);

    if (dto.slug && this.normalizeSlug(dto.slug) !== category.slug) {
      const slug = this.normalizeSlug(dto.slug);
      await this.assertCategorySlugAvailable(slug, id);
      category.slug = slug;
    }

    if (dto.name !== undefined) {
      category.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      category.description = dto.description?.trim() || null;
    }

    return this.toCategoryResponse(await this.categoryRepo.save(category));
  }

  async removeCategory(id: string): Promise<void> {
    const category = await this.findCategoryById(id);
    const blogCount = await this.blogRepo.count({ where: { categoryId: id } });

    if (blogCount > 0) {
      throw new BadRequestException('BLOG_CATEGORY_IN_USE');
    }

    await this.categoryRepo.remove(category);
  }

  async findPublicCategories(): Promise<BlogCategoryResponse[]> {
    const categories = await this.categoryRepo
      .createQueryBuilder('category')
      .innerJoin('category.blogs', 'blog', 'blog.status = :status', {
        status: BlogStatus.PUBLISHED,
      })
      .loadRelationCountAndMap(
        'category.blogCount',
        'category.blogs',
        'publishedBlogs',
        (qb) =>
          qb.andWhere('publishedBlogs.status = :status', {
            status: BlogStatus.PUBLISHED,
          }),
      )
      .orderBy('category.name', 'ASC')
      .getMany();

    return categories.map((category) => this.toCategoryResponse(category));
  }

  async findPublicTags(): Promise<BlogTagResponse[]> {
    const tags = await this.tagRepo
      .createQueryBuilder('tag')
      .innerJoin('tag.blogRelations', 'relation')
      .innerJoin('relation.blog', 'blog', 'blog.status = :status', {
        status: BlogStatus.PUBLISHED,
      })
      .distinct(true)
      .orderBy('tag.name', 'ASC')
      .getMany();

    return tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
    }));
  }

  private async findOneForAdmin(id: string): Promise<BlogResponse> {
    return this.toResponse(await this.findEntityById(id));
  }

  private async findWithPagination(
    query: QueryBlogDto & { tag?: string },
  ): Promise<PaginatedData<BlogResponse>> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 10)));

    const qb = this.blogRepo
      .createQueryBuilder('blog')
      .distinct(true)
      .leftJoinAndSelect('blog.category', 'category')
      .leftJoinAndSelect('blog.author', 'author')
      .leftJoinAndSelect('blog.tagRelations', 'tagRelations')
      .leftJoinAndSelect('tagRelations.tag', 'tag')
      .orderBy('blog.publishedAt', 'DESC', 'NULLS LAST')
      .addOrderBy('blog.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) {
      qb.andWhere('blog.status = :status', { status: query.status });
    }

    if (query.category_id) {
      qb.andWhere('blog.categoryId = :categoryId', {
        categoryId: query.category_id,
      });
    }

    if (query.tag?.trim()) {
      qb.andWhere('tag.slug = :tagSlug', {
        tagSlug: this.normalizeSlug(query.tag),
      });
    }

    if (query.q?.trim()) {
      qb.andWhere(
        '(LOWER(blog.title) LIKE :keyword OR LOWER(blog.summary) LIKE :keyword OR LOWER(blog.slug) LIKE :keyword)',
        { keyword: `%${query.q.trim().toLowerCase()}%` },
      );
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((item) => this.toResponse(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async findEntityById(
    id: string,
    manager?: EntityManager,
  ): Promise<BlogEntity> {
    const repo = manager?.getRepository(BlogEntity) ?? this.blogRepo;
    const blog = await repo.findOne({
      where: { id },
      relations: ['category', 'author', 'tagRelations', 'tagRelations.tag'],
    });

    if (!blog) throw new NotFoundException('BLOG_NOT_FOUND');
    return blog;
  }

  private async findEntityBySlug(slug: string): Promise<BlogEntity> {
    const blog = await this.blogRepo.findOne({
      where: { slug: this.normalizeSlug(slug) },
      relations: ['category', 'author', 'tagRelations', 'tagRelations.tag'],
    });

    if (!blog) throw new NotFoundException('BLOG_NOT_FOUND');
    return blog;
  }

  private async recordView(
    blog: BlogEntity,
    clientKey = 'anonymous',
  ): Promise<void> {
    const now = Date.now();
    const key = `${blog.id}:${clientKey}`;
    const lastViewedAt = this.recentViews.get(key);

    if (lastViewedAt && now - lastViewedAt < VIEW_COUNT_TTL_MS) {
      return;
    }

    this.recentViews.set(key, now);
    if (this.recentViews.size > 10000) {
      for (const [viewKey, viewedAt] of this.recentViews) {
        if (now - viewedAt > VIEW_COUNT_TTL_MS) {
          this.recentViews.delete(viewKey);
        }
      }
    }

    await this.blogRepo.increment({ id: blog.id }, 'viewCount', 1);
    blog.viewCount += 1;
  }

  private async assertSlugAvailable(
    slug: string,
    excludeId?: string,
    manager?: EntityManager,
  ): Promise<void> {
    const normalized = this.normalizeSlug(slug);
    if (!normalized) throw new BadRequestException('BLOG_SLUG_REQUIRED');

<<<<<<< Updated upstream
    const repo = manager?.getRepository(BlogEntity) ?? this.blogRepo;
    const existing = await repo.findOne({ where: { slug: normalized } });
=======
    const existing = await this.blogRepo.findOne({
      where: { slug: normalized },
    });
>>>>>>> Stashed changes
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('BLOG_SLUG_EXISTS');
    }
  }

  private async assertCategoryExists(
    categoryId?: string,
    manager?: EntityManager,
  ): Promise<void> {
    if (!categoryId) return;
    const repo = manager?.getRepository(BlogCategoryEntity) ?? this.categoryRepo;
    const exists = await repo.exist({ where: { id: categoryId } });
    if (!exists) throw new BadRequestException('BLOG_CATEGORY_NOT_FOUND');
  }

  private async replaceTags(
    blogId: string,
    tags: string[],
    manager?: EntityManager,
  ): Promise<void> {
    const tagRepo = manager?.getRepository(BlogTagEntity) ?? this.tagRepo;
    const tagRelationRepo =
      manager?.getRepository(BlogTagRelationEntity) ?? this.tagRelationRepo;

    await tagRelationRepo.delete({ blogId });

    const normalizedTags = this.normalizeTags(tags);
    if (normalizedTags.length === 0) return;

    const slugs = normalizedTags.map((tag) => this.normalizeSlug(tag));
    const existing = await tagRepo.find({ where: { slug: In(slugs) } });
    const existingBySlug = new Map(existing.map((tag) => [tag.slug, tag]));

    const tagEntities: BlogTagEntity[] = [];
    for (const name of normalizedTags) {
      const slug = this.normalizeSlug(name);
      const found = existingBySlug.get(slug);
      if (found) {
        tagEntities.push(found);
      } else {
        const created = await tagRepo.save(
          tagRepo.create({ name, slug }),
        );
        tagEntities.push(created);
      }
    }

    await tagRelationRepo.save(
      tagEntities.map((tag) =>
        tagRelationRepo.create({ blogId, tagId: tag.id }),
      ),
    );
  }

  private resolvePublishedAt(
    status?: BlogStatus,
    publishedAt?: string | null,
  ): Date | null {
    if (publishedAt) return new Date(publishedAt);
    if (status === BlogStatus.PUBLISHED) return new Date();
    return null;
  }

  private async findCategoryById(id: string): Promise<BlogCategoryEntity> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('BLOG_CATEGORY_NOT_FOUND');
    return category;
  }

  private async assertCategorySlugAvailable(
    slug: string,
    excludeId?: string,
  ): Promise<void> {
    if (!slug) throw new BadRequestException('BLOG_CATEGORY_SLUG_REQUIRED');

    const existing = await this.categoryRepo.findOne({ where: { slug } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('BLOG_CATEGORY_SLUG_EXISTS');
    }
  }

  private normalizeTags(tags: string[]): string[] {
    const normalized = Array.from(
      new Set(
        tags
          .map((tag) => tag.trim())
          .filter(Boolean)
          .map((tag) => tag.replace(/\s+/g, ' ')),
      ),
    );

    if (normalized.length > MAX_BLOG_TAGS) {
      throw new BadRequestException('BLOG_TAG_LIMIT_EXCEEDED');
    }

    const invalidTag = normalized.find(
      (tag) =>
        tag.length > MAX_BLOG_TAG_LENGTH ||
        this.normalizeSlug(tag).length === 0,
    );
    if (invalidTag) {
      throw new BadRequestException('BLOG_TAG_INVALID');
    }

    return normalized;
  }

  private normalizeSlug(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private toCategoryResponse(
    category: BlogCategoryEntity & { blogCount?: number },
  ): BlogCategoryResponse {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      blog_count: category.blogCount,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  private toResponse(blog: BlogEntity): BlogResponse {
    return {
      id: blog.id,
      title: blog.title,
      slug: blog.slug,
      summary: blog.summary,
      content: blog.content,
      thumbnail_url: blog.thumbnailUrl,
      category_id: blog.categoryId,
      category: blog.category ?? null,
      tags: (blog.tagRelations ?? []).flatMap((relation) =>
        relation.tag?.name ? [relation.tag.name] : [],
      ),
      author: blog.author
        ? {
            id: blog.author.id,
            fullName: blog.author.fullName,
            email: blog.author.email,
          }
        : null,
      status: blog.status,
      view_count: blog.viewCount,
      published_at: blog.publishedAt,
      createdAt: blog.createdAt,
      updatedAt: blog.updatedAt,
    };
  }
}
