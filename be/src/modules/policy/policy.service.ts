import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, FindOptionsWhere } from 'typeorm';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { Policy, PolicyCategory, PolicyRole } from './entity/policy.entity';
import { ServicePackageEntity } from '../service/entity/service-package.entity';
import { DEFAULT_POLICIES } from '../../database/seeds/policy.seed';

@Injectable()
export class PolicyService {
  constructor(
    @InjectRepository(Policy)
    private readonly policyRepository: Repository<Policy>,
    @InjectRepository(ServicePackageEntity)
    private readonly packageRepository: Repository<ServicePackageEntity>,
  ) {}

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  async create(createPolicyDto: CreatePolicyDto) {
    const existed = await this.policyRepository.findOne({
      where: { slug: createPolicyDto.slug },
    });
    if (existed) throw new BadRequestException('Slug đã tồn tại');
    const policy = this.policyRepository.create(createPolicyDto);
    return this.policyRepository.save(policy);
  }

  async findAll(category?: PolicyCategory) {
    const where = category ? { category } : {};
    return this.policyRepository.find({
      where,
      order: { category: 'ASC', sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const policy = await this.policyRepository.findOne({ where: { id } });
    if (!policy) throw new NotFoundException('Không tìm thấy chính sách');
    return policy;
  }

  async update(id: string, updatePolicyDto: UpdatePolicyDto) {
    await this.findOne(id);
    await this.policyRepository.update(id, updatePolicyDto);
    return this.findOne(id);
  }

  async remove(id: string) {
    const policy = await this.findOne(id);
    await this.policyRepository.remove(policy);
    return { message: 'Đã xóa chính sách' };
  }

  // ─── Seed ────────────────────────────────────────────────────────────────────

  /** Seed dữ liệu mặc định — bỏ qua slug đã tồn tại */
  async bulkSeed(): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;
    for (const data of DEFAULT_POLICIES) {
      const exists = await this.policyRepository.findOne({ where: { slug: data.slug } });
      if (exists) { skipped++; continue; }
      await this.policyRepository.save(this.policyRepository.create(data));
      created++;
    }
    return { created, skipped };
  }

  // ─── Public ──────────────────────────────────────────────────────────────────

  async getPublicPolicies(role?: PolicyRole) {
    const where: FindOptionsWhere<Policy> = { isActive: true };
    if (role === PolicyRole.TASKER) {
      where.role = In([PolicyRole.TASKER, PolicyRole.ALL]) as any;
    } else if (role === PolicyRole.CUSTOMER) {
      where.role = In([PolicyRole.CUSTOMER, PolicyRole.ALL]) as any;
    }
    return this.policyRepository.find({
      where,
      order: { category: 'ASC', sortOrder: 'ASC' },
    });
  }

  async findPublicBySlug(slug: string) {
    const policy = await this.policyRepository.findOne({
      where: { slug, isActive: true },
    });
    if (!policy) throw new NotFoundException('Không tìm thấy chính sách');
    return policy;
  }

  async getDefaults() {
    return this.policyRepository.find({
      where: { isDefault: true, isActive: true },
      order: { category: 'ASC', sortOrder: 'ASC' },
    });
  }

  // ─── Package Assignment ───────────────────────────────────────────────────────

  async getPoliciesByPackage(packageId: string): Promise<Policy[]> {
    const pkg = await this.packageRepository.findOne({
      where: { id: packageId },
      relations: ['policies'],
    });
    if (!pkg) throw new NotFoundException('Không tìm thấy gói dịch vụ');
    return pkg.policies ?? [];
  }

  async assignPoliciesToPackage(packageId: string, policyIds: string[]): Promise<Policy[]> {
    const pkg = await this.packageRepository.findOne({
      where: { id: packageId },
      relations: ['policies'],
    });
    if (!pkg) throw new NotFoundException('Không tìm thấy gói dịch vụ');

    const policies = await this.policyRepository.find({ where: { id: In(policyIds) } });
    const existingIds = (pkg.policies ?? []).map((p) => p.id);
    const newPolicies = policies.filter((p) => !existingIds.includes(p.id));
    pkg.policies = [...(pkg.policies ?? []), ...newPolicies];
    await this.packageRepository.save(pkg);
    return pkg.policies;
  }

  async removePolicyFromPackage(packageId: string, policyId: string): Promise<Policy[]> {
    const pkg = await this.packageRepository.findOne({
      where: { id: packageId },
      relations: ['policies'],
    });
    if (!pkg) throw new NotFoundException('Không tìm thấy gói dịch vụ');
    pkg.policies = (pkg.policies ?? []).filter((p) => p.id !== policyId);
    await this.packageRepository.save(pkg);
    return pkg.policies;
  }

  /** Tự động gán policies mặc định khi tạo Package mới */
  async applyDefaultsToPackage(packageId: string): Promise<void> {
    const defaults = await this.getDefaults();
    if (defaults.length === 0) return;
    await this.assignPoliciesToPackage(packageId, defaults.map((p) => p.id));
  }

  /** Lấy danh sách gói dịch vụ đang dùng policy này */
  async getPackagesByPolicy(policyId: string) {
    const policy = await this.policyRepository.findOne({
      where: { id: policyId },
      relations: ['packages'],
    });
    if (!policy) throw new NotFoundException('Không tìm thấy chính sách');
    return (policy.packages ?? []).map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      packageCode: pkg.packageCode,
      isActive: pkg.isActive,
    }));
  }
}
