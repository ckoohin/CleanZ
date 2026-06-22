import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { Policy } from './entity/policy.entity';

@Injectable()
export class PolicyService {
  constructor(
    @InjectRepository(Policy)
    private readonly policyRepository: Repository<Policy>,
  ) {}

  async create(createPolicyDto: CreatePolicyDto) {
    const existed = await this.policyRepository.findOne({
      where: {
        slug: createPolicyDto.slug,
      },
    });

    if (existed) {
      throw new BadRequestException('Slug already exists');
    }

    const policy = this.policyRepository.create(createPolicyDto);

    return this.policyRepository.save(policy);
  }
  async findAll() {
    return this.policyRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string) {
    const policy = await this.policyRepository.findOne({
      where: { id },
    });
    if (!policy) {
      throw new NotFoundException('Policy not found');
    }
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
    return {
      message: 'xóa chính sách thành công',
    };
  }
  async getPublicPolicies() {
    return this.policyRepository.find({
      where: {
        isActive: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findPublicBySlug(slug: string) {
    const policy = await this.policyRepository.findOne({
      where: {
        slug,
        isActive: true,
      },
    });

    if (!policy) {
      throw new NotFoundException('Policy not found');
    }
    return policy;
  }
}
