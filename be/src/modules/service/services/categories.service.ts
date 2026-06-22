import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from '../entity/category.entity';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<CategoryEntity> {
    const slug = dto.slug || this.generateSlug(dto.name);

    // Kiểm tra xem slug đã tồn tại chưa
    const existing = await this.categoryRepository.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException('Đường dẫn (slug) danh mục đã tồn tại');
    }

    const category = this.categoryRepository.create({
      name: dto.name,
      slug,
      iconUrl: dto.iconUrl || null,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    });

    return this.categoryRepository.save(category);
  }

  async findAll(): Promise<CategoryEntity[]> {
    return this.categoryRepository.find({
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<CategoryEntity> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryEntity> {
    const category = await this.findOne(id);

    if (dto.name && !dto.slug) {
      dto.slug = this.generateSlug(dto.name);
    }

    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.categoryRepository.findOne({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException('Đường dẫn (slug) danh mục đã tồn tại');
      }
    }

    Object.assign(category, {
      name: dto.name ?? category.name,
      slug: dto.slug ?? category.slug,
      iconUrl: dto.iconUrl !== undefined ? dto.iconUrl : category.iconUrl,
      sortOrder: dto.sortOrder ?? category.sortOrder,
      isActive: dto.isActive !== undefined ? dto.isActive : category.isActive,
    });

    return this.categoryRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    // Có thể bổ sung check xem có service nào đang thuộc danh mục này không
    await this.categoryRepository.remove(category);
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
