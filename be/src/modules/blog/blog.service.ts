import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PaginatedData } from '../../common/helpers/response.interface';
import { CreateBlogDto } from './dto/create-blog.dto';
import { QueryBlogDto } from './dto/query-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { BlogCategoryEntity } from './entity/blog-category.entity';
import { BlogTagRelationEntity } from './entity/blog-tag-relation.entity';
import { BlogTagEntity } from './entity/blog-tag.entity';
import { BlogEntity, BlogStatus } from './entity/blog.entity';

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

@Injectable()
export class BlogService {
  constructor(
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
    query: QueryBlogDto,
  ): Promise<PaginatedData<BlogResponse>> {
    return this.findWithPagination({ ...query, status: BlogStatus.PUBLISHED });
  }

  async findPublishedOne(id: string): Promise<BlogResponse> {
    const blog = await this.findEntityById(id);
    if (blog.status !== BlogStatus.PUBLISHED) {
      throw new NotFoundException('BLOG_NOT_FOUND');
    }

    await this.blogRepo.increment({ id }, 'viewCount', 1);
    blog.viewCount += 1;

    return this.toResponse(blog);
  }

  async findAllForAdmin(
    query: QueryBlogDto,
  ): Promise<PaginatedData<BlogResponse>> {
    return this.findWithPagination(query);
  }

  async create(dto: CreateBlogDto, authorId?: string): Promise<BlogResponse> {
    await this.assertSlugAvailable(dto.slug);
    await this.assertCategoryExists(dto.category_id);

    const blog = this.blogRepo.create({
      title: dto.title,
      slug: this.normalizeSlug(dto.slug),
      summary: dto.summary ?? null,
      content: dto.content,
      thumbnailUrl: dto.thumbnail_url ?? null,
      categoryId: dto.category_id ?? null,
      authorId: authorId ?? null,
      status: dto.status ?? BlogStatus.DRAFT,
      publishedAt: this.resolvePublishedAt(dto.status, dto.published_at),
    });

    const saved = await this.blogRepo.save(blog);
    await this.replaceTags(saved.id, dto.tags ?? []);

    return this.findOneForAdmin(saved.id);
  }

  async update(id: string, dto: UpdateBlogDto): Promise<BlogResponse> {
    const blog = await this.findEntityById(id);

    if (dto.slug && this.normalizeSlug(dto.slug) !== blog.slug) {
      await this.assertSlugAvailable(dto.slug, id);
      blog.slug = this.normalizeSlug(dto.slug);
    }

    await this.assertCategoryExists(dto.category_id);

    blog.title = dto.title ?? blog.title;
    blog.summary = dto.summary !== undefined ? dto.summary : blog.summary;
    blog.content = dto.content ?? blog.content;
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

    await this.blogRepo.save(blog);

    if (dto.tags !== undefined) {
      await this.replaceTags(id, dto.tags);
    }

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
    if (status !== BlogStatus.PUBLISHED) {
      blog.publishedAt = null;
    }
    await this.blogRepo.save(blog);
    return this.findOneForAdmin(id);
  }

  private async findOneForAdmin(id: string): Promise<BlogResponse> {
    return this.toResponse(await this.findEntityById(id));
  }

  private async findWithPagination(
    query: QueryBlogDto,
  ): Promise<PaginatedData<BlogResponse>> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 10)));

    const qb = this.blogRepo
      .createQueryBuilder('blog')
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

  private async findEntityById(id: string): Promise<BlogEntity> {
    const blog = await this.blogRepo.findOne({
      where: { id },
      relations: ['category', 'author', 'tagRelations', 'tagRelations.tag'],
    });

    if (!blog) throw new NotFoundException('BLOG_NOT_FOUND');
    return blog;
  }

  private async assertSlugAvailable(
    slug: string,
    excludeId?: string,
  ): Promise<void> {
    const normalized = this.normalizeSlug(slug);
    if (!normalized) throw new BadRequestException('BLOG_SLUG_REQUIRED');

    const existing = await this.blogRepo.findOne({ where: { slug: normalized } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('BLOG_SLUG_EXISTS');
    }
  }

  private async assertCategoryExists(categoryId?: string): Promise<void> {
    if (!categoryId) return;
    const exists = await this.categoryRepo.exist({ where: { id: categoryId } });
    if (!exists) throw new BadRequestException('BLOG_CATEGORY_NOT_FOUND');
  }

  private async replaceTags(blogId: string, tags: string[]): Promise<void> {
    await this.tagRelationRepo.delete({ blogId });

    const normalizedTags = Array.from(
      new Set(tags.map((tag) => tag.trim()).filter(Boolean)),
    );
    if (normalizedTags.length === 0) return;

    const slugs = normalizedTags.map((tag) => this.normalizeSlug(tag));
    const existing = await this.tagRepo.find({ where: { slug: In(slugs) } });
    const existingBySlug = new Map(existing.map((tag) => [tag.slug, tag]));

    const tagEntities: BlogTagEntity[] = [];
    for (const name of normalizedTags) {
      const slug = this.normalizeSlug(name);
      const found = existingBySlug.get(slug);
      if (found) {
        tagEntities.push(found);
      } else {
        const created = await this.tagRepo.save(
          this.tagRepo.create({ name, slug }),
        );
        tagEntities.push(created);
      }
    }

    await this.tagRelationRepo.save(
      tagEntities.map((tag) =>
        this.tagRelationRepo.create({ blogId, tagId: tag.id }),
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

  private normalizeSlug(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
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
