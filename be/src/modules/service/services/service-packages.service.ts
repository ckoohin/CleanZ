import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ServicePackageEntity } from '../entity/service-package.entity';
import { CreateServicePackageDto } from '../dto/create-service-package.dto';
import { UpdateServicePackageDto } from '../dto/update-service-package.dto';
import { CoverageAreaEntity } from '../entity/coverage-area.entity';
import { PackageSubServiceEntity } from '../entity/package-sub-service.entity';
import { AddSubServicesToPackageDto } from '../dto/add-sub-services-to-package.dto';
import { ServiceDurationEntity } from '../entity/service-duration.entity';
import { ServiceAddonEntity } from '../entity/service-addon.entity';
import { ServiceSubscriptionEntity } from '../entity/service-subscription.entity';
import { ServicePeakHourEntity } from '../entity/service-peak-hour.entity';
import { ServiceSubServiceEntity } from '../entity/service-sub-service.entity';

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
    @InjectRepository(PackageSubServiceEntity)
    private readonly pssRepository: Repository<PackageSubServiceEntity>,
    @InjectRepository(ServiceDurationEntity)
    private readonly durationRepository: Repository<ServiceDurationEntity>,
    @InjectRepository(ServiceAddonEntity)
    private readonly addonRepository: Repository<ServiceAddonEntity>,
    @InjectRepository(ServiceSubscriptionEntity)
    private readonly subscriptionRepository: Repository<ServiceSubscriptionEntity>,
    @InjectRepository(ServicePeakHourEntity)
    private readonly peakHourRepository: Repository<ServicePeakHourEntity>,
    @InjectRepository(ServiceSubServiceEntity)
    private readonly subServiceRepository: Repository<ServiceSubServiceEntity>,
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
      galleryUrls: dto.galleryUrls || null,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
      maxHours: dto.maxHours ?? 8.0,
      pricingMode: dto.pricingMode ?? null,
      termsAndConditions: dto.termsAndConditions || null,
      policyDescription: dto.policyDescription || null,
      nightSurcharge: dto.nightSurcharge ?? 0,
      petSurcharge: dto.petSurcharge ?? 0,
      waitingSurcharge: dto.waitingSurcharge ?? 0,
      toolFee: dto.toolFee ?? 0,
      peakRatePercent: dto.peakRatePercent ?? 0,
      baseHourlyRate: dto.baseHourlyRate ?? 0,
      premiumHourlyRate: dto.premiumHourlyRate ?? 0,
      allowMultipleTaskers: dto.allowMultipleTaskers ?? false,
      allowSubscription: dto.allowSubscription ?? false,
      coverageAreas: dto.coverageAreaIds
        ? dto.coverageAreaIds.map((id) => ({ id }) as CoverageAreaEntity)
        : [],
    });

    const saved = await this.packageRepository.save(servicePackage);

    // Save durations
    if (dto.durations && dto.durations.length > 0) {
      const durEntities = dto.durations.map((d) =>
        this.durationRepository.create({
          packageId: saved.id,
          durationHours: d.durationHours,
          priceMultiplier: d.priceMultiplier,
          isPopular: d.isPopular ?? false,
          isActive: d.isActive ?? true,
          suggestedArea: d.suggestedArea || null,
          taskerCount: d.taskerCount ?? 1,
          title: d.title ?? null,
          description: d.description ?? null,
        }),
      );
      await this.durationRepository.save(durEntities);
    }

    // Save addons
    if (dto.addons && dto.addons.length > 0) {
      const addonEntities = dto.addons.map((a) =>
        this.addonRepository.create({
          packageId: saved.id,
          name: a.name,
          description: a.description || undefined,
          iconUrl: a.iconUrl || undefined,
          price: a.price,
          priceUnit: a.priceUnit ?? 'per_item',
          durationMinutes: a.durationMinutes ?? null,
          maxQuantity: a.maxQuantity ?? null,
          sortOrder: a.sortOrder ?? 0,
          isActive: a.isActive ?? true,
        }),
      );
      await this.addonRepository.save(addonEntities);
    }

    // Save subscriptions
    if (dto.subscriptions && dto.subscriptions.length > 0) {
      const subEntities = dto.subscriptions.map((s) =>
        this.subscriptionRepository.create({
          packageId: saved.id,
          name: s.name,
          description: s.description || undefined,
          bonusDescription: s.bonusDescription || undefined,
          discountPercent: s.discountPercent,
          billingCycle: s.billingCycle ?? 'monthly',
          sessionsPerCycle: s.sessionsPerCycle ?? null,
          commitmentMonths: s.commitmentMonths ?? null,
          isPopular: s.isPopular ?? false,
          sortOrder: s.sortOrder ?? 0,
          isActive: s.isActive ?? true,
        }),
      );
      await this.subscriptionRepository.save(subEntities);
    }

    // Save peakHours
    if (dto.peakHours && dto.peakHours.length > 0) {
      const peakEntities = dto.peakHours.map((p) =>
        this.peakHourRepository.create({
          packageId: saved.id,
          dayOfWeek: p.dayOfWeek,
          startHour: p.startHour,
          endHour: p.endHour,
          multiplier: p.multiplier,
          startDate: p.startDate ? new Date(p.startDate) : null,
          endDate: p.endDate ? new Date(p.endDate) : null,
          isActive: p.isActive ?? true,
        }),
      );
      await this.peakHourRepository.save(peakEntities);
    }

    // Save subServices
    if (dto.subServices && dto.subServices.length > 0) {
      const ssEntities = dto.subServices.map((ss) =>
        this.subServiceRepository.create({
          packageId: saved.id,
          subServiceId: ss.subServiceId,
          price: ss.price,
          isActive: ss.isActive ?? true,
        }),
      );
      await this.subServiceRepository.save(ssEntities);
    }

    return this.findOne(saved.id);
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
        'durations',
        'addons',
        'subscriptions',
        'peakHours',
        'subServices',
        'subServices.subService',
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
      galleryUrls:
        dto.galleryUrls !== undefined
          ? dto.galleryUrls
          : servicePackage.galleryUrls,
      sortOrder: dto.sortOrder ?? servicePackage.sortOrder,
      isActive:
        dto.isActive !== undefined ? dto.isActive : servicePackage.isActive,
      maxHours: dto.maxHours ?? servicePackage.maxHours,
      pricingMode:
        dto.pricingMode !== undefined
          ? dto.pricingMode
          : servicePackage.pricingMode,
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
      baseHourlyRate: dto.baseHourlyRate ?? servicePackage.baseHourlyRate,
      premiumHourlyRate:
        dto.premiumHourlyRate ?? servicePackage.premiumHourlyRate,
      allowMultipleTaskers:
        dto.allowMultipleTaskers ?? servicePackage.allowMultipleTaskers,
      allowSubscription:
        dto.allowSubscription ?? servicePackage.allowSubscription,
    });

    if (dto.coverageAreaIds) {
      servicePackage.coverageAreas = dto.coverageAreaIds.map(
        (areaId) => ({ id: areaId }) as CoverageAreaEntity,
      );
    }

    await this.packageRepository.save(servicePackage);

    // Update durations
    if (dto.durations !== undefined) {
      await this.durationRepository.delete({ packageId: id });
      if (dto.durations.length > 0) {
        const durEntities = dto.durations.map((d) =>
          this.durationRepository.create({
            packageId: id,
            durationHours: d.durationHours,
            priceMultiplier: d.priceMultiplier,
            isPopular: d.isPopular ?? false,
            isActive: d.isActive ?? true,
            suggestedArea: d.suggestedArea || null,
            taskerCount: d.taskerCount ?? 1,
            title: d.title ?? null,
            description: d.description ?? null,
          }),
        );
        await this.durationRepository.save(durEntities);
      }
    }

    // Update addons
    if (dto.addons !== undefined) {
      await this.addonRepository.delete({ packageId: id });
      if (dto.addons.length > 0) {
        const addonEntities = dto.addons.map((a) =>
          this.addonRepository.create({
            packageId: id,
            name: a.name,
            description: a.description || undefined,
            iconUrl: a.iconUrl || undefined,
            price: a.price,
            priceUnit: a.priceUnit ?? 'per_item',
            durationMinutes: a.durationMinutes ?? null,
            maxQuantity: a.maxQuantity ?? null,
            sortOrder: a.sortOrder ?? 0,
            isActive: a.isActive ?? true,
          }),
        );
        await this.addonRepository.save(addonEntities);
      }
    }

    // Update subscriptions
    if (dto.subscriptions !== undefined) {
      await this.subscriptionRepository.delete({ packageId: id });
      if (dto.subscriptions.length > 0) {
        const subEntities = dto.subscriptions.map((s) =>
          this.subscriptionRepository.create({
            packageId: id,
            name: s.name,
            description: s.description || undefined,
            bonusDescription: s.bonusDescription || undefined,
            discountPercent: s.discountPercent,
            billingCycle: s.billingCycle ?? 'monthly',
            sessionsPerCycle: s.sessionsPerCycle ?? null,
            commitmentMonths: s.commitmentMonths ?? null,
            isPopular: s.isPopular ?? false,
            sortOrder: s.sortOrder ?? 0,
            isActive: s.isActive ?? true,
          }),
        );
        await this.subscriptionRepository.save(subEntities);
      }
    }

    // Update peakHours
    if (dto.peakHours !== undefined) {
      await this.peakHourRepository.delete({ packageId: id });
      if (dto.peakHours.length > 0) {
        const peakEntities = dto.peakHours.map((p) =>
          this.peakHourRepository.create({
            packageId: id,
            dayOfWeek: p.dayOfWeek,
            startHour: p.startHour,
            endHour: p.endHour,
            multiplier: p.multiplier,
            startDate: p.startDate ? new Date(p.startDate) : null,
            endDate: p.endDate ? new Date(p.endDate) : null,
            isActive: p.isActive ?? true,
          }),
        );
        await this.peakHourRepository.save(peakEntities);
      }
    }

    // Update subServices
    if (dto.subServices !== undefined) {
      await this.subServiceRepository.delete({ packageId: id });
      if (dto.subServices.length > 0) {
        const ssEntities = dto.subServices.map((ss) =>
          this.subServiceRepository.create({
            packageId: id,
            subServiceId: ss.subServiceId,
            price: ss.price,
            isActive: ss.isActive ?? true,
          }),
        );
        await this.subServiceRepository.save(ssEntities);
      }
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const servicePackage = await this.findOne(id);
    await this.packageRepository.remove(servicePackage);
  }

  async addSubServices(
    packageId: string,
    dto: AddSubServicesToPackageDto,
  ): Promise<void> {
    await this.findOne(packageId); // Verify package exists

    // Remove existing links for these sub-services (upsert pattern)
    const incomingIds = dto.subServices.map((s) => s.id);
    if (incomingIds.length > 0) {
      await this.pssRepository.delete({
        packageId,
        subServiceId: In(incomingIds),
      });
    }

    // Insert new links
    const entities = dto.subServices.map((item, index) =>
      this.pssRepository.create({
        packageId,
        subServiceId: item.id,
        isRequired: item.isRequired ?? false,
        isDefault: item.isDefault ?? false,
        sortOrder: item.sortOrder ?? index,
      }),
    );

    await this.pssRepository.save(entities);
  }

  async removeSubService(
    packageId: string,
    subServiceId: string,
  ): Promise<void> {
    await this.pssRepository.delete({ packageId, subServiceId });
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

    interface StatsResult {
      totalBookings: number;
      totalRevenue: string | number;
      completedBookings: number;
      cancelledBookings: number;
    }

    interface TaskerResult {
      taskerId: string;
      fullName: string;
      phoneNumber: string;
      completedJobs: number;
    }

    const [statsResult, taskersResult] = (await Promise.all([
      this.packageRepository.query(statsQuery, [id]),
      this.packageRepository.query(taskersQuery, [id]),
    ])) as [StatsResult[], TaskerResult[]];

    const stats = statsResult[0] || {
      totalBookings: 0,
      totalRevenue: 0,
      completedBookings: 0,
      cancelledBookings: 0,
    };
    return {
      totalBookings: Number(stats.totalBookings),
      totalRevenue: Number(stats.totalRevenue),
      completedBookings: Number(stats.completedBookings),
      cancelledBookings: Number(stats.cancelledBookings),
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
