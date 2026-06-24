import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServicePackageEntity } from '../entity/service-package.entity';
import { CreateServicePackageDto } from '../dto/create-service-package.dto';
import { UpdateServicePackageDto } from '../dto/update-service-package.dto';
import { CoverageAreaEntity } from '../entity/coverage-area.entity';

export interface ServicePackageAnalytics {
  totalBookings: number;
  totalRevenue: number;
  completedBookings: number;
  cancelledBookings: number;
  topTaskers: {
    taskerId: string;
    fullName: string;
    phoneNumber: string;
    completedJobs: number;
  }[];
}

@Injectable()
export class ServicePackagesService {
  constructor(
    @InjectRepository(ServicePackageEntity)
    private readonly packageRepository: Repository<ServicePackageEntity>,
  ) {}

  async create(dto: CreateServicePackageDto): Promise<ServicePackageEntity> {
    const packageCode = dto.packageCode || this.generateCode(dto.name);

    // Kiểm tra xem packageCode đã tồn tại chưa
    const existing = await this.packageRepository.findOne({
      where: { packageCode },
    });
    if (existing) {
      throw new ConflictException('Mã gói dịch vụ đã tồn tại');
    }

    const servicePackage = this.packageRepository.create({
      name: dto.name,
      packageCode,
      iconUrl: dto.iconUrl || null,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
      maxHours: dto.maxHours ?? 8.0,
      termsAndConditions: dto.termsAndConditions || null,
      policyDescription: dto.policyDescription || null,
      nightSurcharge: dto.nightSurcharge ?? 0,
      petSurcharge: dto.petSurcharge ?? 0,
      waitingSurcharge: dto.waitingSurcharge ?? 0,
      toolFee: dto.toolFee ?? 0,
      peakRatePercent: dto.peakRatePercent ?? 0,
      coverageAreas: dto.coverageAreaIds
        ? dto.coverageAreaIds.map((id) => ({ id }) as CoverageAreaEntity)
        : [],
    });

    return this.packageRepository.save(servicePackage);
  }

  async findAll(): Promise<ServicePackageEntity[]> {
    return this.packageRepository.find({
      relations: ['coverageAreas'],
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async findAvailablePackages(
    search?: string,
  ): Promise<ServicePackageEntity[]> {
    const qb = this.packageRepository
      .createQueryBuilder('pkg')
      .leftJoinAndSelect('pkg.coverageAreas', 'area')
      .leftJoinAndSelect('pkg.packageSubServices', 'pss')
      .leftJoinAndSelect('pss.subService', 'sub', 'sub.isActive = true')
      .leftJoinAndSelect('sub.pricingConfig', 'pricing')
      .where('pkg.isActive = true')
      .orderBy('pkg.sortOrder', 'ASC')
      .addOrderBy('pkg.createdAt', 'DESC');

    if (search?.trim()) {
      qb.andWhere(
        '(pkg.name ILIKE :search OR pkg.policyDescription ILIKE :search)',
        {
          search: `%${search.trim()}%`,
        },
      );
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<ServicePackageEntity> {
    const servicePackage = await this.packageRepository.findOne({
      where: { id },
      relations: [
        'coverageAreas',
        'packageSubServices',
        'packageSubServices.subService',
      ],
    });
    if (!servicePackage) {
      throw new NotFoundException('Không tìm thấy gói dịch vụ');
    }
    return servicePackage;
  }

  async update(
    id: string,
    dto: UpdateServicePackageDto,
  ): Promise<ServicePackageEntity> {
    const servicePackage = await this.findOne(id);

    if (dto.name && !dto.packageCode) {
      dto.packageCode = this.generateCode(dto.name);
    }

    if (dto.packageCode && dto.packageCode !== servicePackage.packageCode) {
      const existing = await this.packageRepository.findOne({
        where: { packageCode: dto.packageCode },
      });
      if (existing) {
        throw new ConflictException('Mã gói dịch vụ đã tồn tại');
      }
    }

    Object.assign(servicePackage, {
      name: dto.name ?? servicePackage.name,
      packageCode: dto.packageCode ?? servicePackage.packageCode,
      iconUrl: dto.iconUrl !== undefined ? dto.iconUrl : servicePackage.iconUrl,
      sortOrder: dto.sortOrder ?? servicePackage.sortOrder,
      isActive:
        dto.isActive !== undefined ? dto.isActive : servicePackage.isActive,
      maxHours: dto.maxHours ?? servicePackage.maxHours,
      termsAndConditions:
        dto.termsAndConditions !== undefined
          ? dto.termsAndConditions
          : servicePackage.termsAndConditions,
      policyDescription:
        dto.policyDescription !== undefined
          ? dto.policyDescription
          : servicePackage.policyDescription,
      nightSurcharge: dto.nightSurcharge ?? servicePackage.nightSurcharge,
      petSurcharge: dto.petSurcharge ?? servicePackage.petSurcharge,
      waitingSurcharge: dto.waitingSurcharge ?? servicePackage.waitingSurcharge,
      toolFee: dto.toolFee ?? servicePackage.toolFee,
      peakRatePercent: dto.peakRatePercent ?? servicePackage.peakRatePercent,
    });

    if (dto.coverageAreaIds) {
      servicePackage.coverageAreas = dto.coverageAreaIds.map(
        (areaId) => ({ id: areaId }) as CoverageAreaEntity,
      );
    }

    return this.packageRepository.save(servicePackage);
  }

  async remove(id: string): Promise<void> {
    const servicePackage = await this.findOne(id);
    await this.packageRepository.remove(servicePackage);
  }

  async getAnalytics(id: string): Promise<ServicePackageAnalytics> {
    await this.findOne(id); // Check existence

    const statsQuery = `
      SELECT 
        COUNT(id)::int AS "totalBookings",
        COALESCE(SUM(total_price), 0)::numeric AS "totalRevenue",
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)::int AS "completedBookings",
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END)::int AS "cancelledBookings"
      FROM bookings
      WHERE package_id = $1
    `;

    const taskersQuery = `
      SELECT 
        t.id AS "taskerId", u.full_name AS "fullName", u.phone AS "phoneNumber",
        COUNT(b.id)::int AS "completedJobs"
      FROM taskers t
      JOIN users u ON t.user_id = u.id
      JOIN bookings b ON b.tasker_id = t.id
      WHERE b.package_id = $1 AND b.status = 'COMPLETED'
      GROUP BY t.id, u.full_name, u.phone
      ORDER BY "completedJobs" DESC
      LIMIT 5
    `;

    const [statsResult, taskersResult] = await Promise.all([
      this.packageRepository.query(statsQuery, [id]),
      this.packageRepository.query(taskersQuery, [id]),
    ]);

    const stats = statsResult[0] || {
      totalBookings: 0,
      totalRevenue: 0,
      completedBookings: 0,
      cancelledBookings: 0,
    };
    return {
      totalBookings: stats.totalBookings,
      totalRevenue: Number(stats.totalRevenue),
      completedBookings: stats.completedBookings,
      cancelledBookings: stats.cancelledBookings,
      topTaskers: taskersResult,
    };
  }

  private generateCode(text: string): string {
    return (
      'PKG-' +
      text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toUpperCase()
    );
  }
}
