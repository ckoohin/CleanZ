import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CoverageAreaEntity } from '../entity/coverage-area.entity';

// ─── Static seed data: 30 quận/huyện Hà Nội ──────────────────────────────────
export const HANOI_DISTRICTS = [
  // Quận nội thành
  { name: 'Ba Đình', city: 'Hà Nội', transportFee: 0 },
  { name: 'Hoàn Kiếm', city: 'Hà Nội', transportFee: 0 },
  { name: 'Tây Hồ', city: 'Hà Nội', transportFee: 0 },
  { name: 'Long Biên', city: 'Hà Nội', transportFee: 10000 },
  { name: 'Cầu Giấy', city: 'Hà Nội', transportFee: 0 },
  { name: 'Đống Đa', city: 'Hà Nội', transportFee: 0 },
  { name: 'Hai Bà Trưng', city: 'Hà Nội', transportFee: 0 },
  { name: 'Hoàng Mai', city: 'Hà Nội', transportFee: 10000 },
  { name: 'Thanh Xuân', city: 'Hà Nội', transportFee: 0 },
  { name: 'Hà Đông', city: 'Hà Nội', transportFee: 15000 },
  { name: 'Nam Từ Liêm', city: 'Hà Nội', transportFee: 10000 },
  { name: 'Bắc Từ Liêm', city: 'Hà Nội', transportFee: 10000 },
  // Huyện ngoại thành gần
  { name: 'Thanh Trì', city: 'Hà Nội', transportFee: 20000 },
  { name: 'Gia Lâm', city: 'Hà Nội', transportFee: 20000 },
  { name: 'Đông Anh', city: 'Hà Nội', transportFee: 25000 },
  { name: 'Mê Linh', city: 'Hà Nội', transportFee: 30000 },
  { name: 'Hoài Đức', city: 'Hà Nội', transportFee: 25000 },
  { name: 'Đan Phượng', city: 'Hà Nội', transportFee: 30000 },
  { name: 'Quốc Oai', city: 'Hà Nội', transportFee: 35000 },
  { name: 'Thạch Thất', city: 'Hà Nội', transportFee: 40000 },
  // Huyện ngoại thành xa
  { name: 'Sóc Sơn', city: 'Hà Nội', transportFee: 40000 },
  { name: 'Chương Mỹ', city: 'Hà Nội', transportFee: 40000 },
  { name: 'Thanh Oai', city: 'Hà Nội', transportFee: 35000 },
  { name: 'Thường Tín', city: 'Hà Nội', transportFee: 35000 },
  { name: 'Phú Xuyên', city: 'Hà Nội', transportFee: 50000 },
  { name: 'Ứng Hòa', city: 'Hà Nội', transportFee: 50000 },
  { name: 'Mỹ Đức', city: 'Hà Nội', transportFee: 60000 },
  { name: 'Ba Vì', city: 'Hà Nội', transportFee: 60000 },
  { name: 'Phúc Thọ', city: 'Hà Nội', transportFee: 45000 },
  { name: 'Ứng Hòa', city: 'Hà Nội', transportFee: 50000 },
];

@Injectable()
export class CoverageAreasService {
  constructor(
    @InjectRepository(CoverageAreaEntity)
    private readonly areaRepository: Repository<CoverageAreaEntity>,
  ) {}

  async findAll(city?: string): Promise<CoverageAreaEntity[]> {
    const qb = this.areaRepository
      .createQueryBuilder('area')
      .orderBy('area.name', 'ASC');

    if (city) {
      qb.where('area.city = :city', { city });
    }

    return qb.getMany();
  }

  async findByIds(ids: string[]): Promise<CoverageAreaEntity[]> {
    if (!ids.length) return [];
    return this.areaRepository.find({ where: { id: In(ids) } });
  }

  async findOne(id: string): Promise<CoverageAreaEntity> {
    const area = await this.areaRepository.findOne({ where: { id } });
    if (!area) throw new NotFoundException('Không tìm thấy khu vực phục vụ');
    return area;
  }

  /**
   * Seed 30 quận/huyện Hà Nội nếu chưa có dữ liệu
   */
  async seedHanoiDistricts(): Promise<{ seeded: number; skipped: number }> {
    const existing = await this.areaRepository.count({
      where: {
        city: 'Hà Nội',
      },
    });
    if (existing > 0) {
      return { seeded: 0, skipped: existing };
    }

    const uniqueDistricts = HANOI_DISTRICTS.filter(
      (d, index, self) => index === self.findIndex((t) => t.name === d.name),
    );

    const entities = uniqueDistricts.map((d) =>
      this.areaRepository.create({
        name: d.name,
        city: d.city,
        transportFee: d.transportFee,
        isActive: true,
      }),
    );

    await this.areaRepository.save(entities);
    return { seeded: entities.length, skipped: 0 };
  }

  async update(id: string, transportFee: number): Promise<CoverageAreaEntity> {
    const area = await this.findOne(id);
    area.transportFee = transportFee;
    return this.areaRepository.save(area);
  }
}
