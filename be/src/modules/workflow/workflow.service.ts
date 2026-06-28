import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceWorkflowEntity } from './entity/service-workflow.entity';
import { WorkflowStepEntity } from './entity/workflow-step.entity';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import {
  CreateWorkflowStepDto,
  UpdateWorkflowStepDto,
} from './dto/create-workflow-step.dto';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(ServiceWorkflowEntity)
    private readonly workflowRepo: Repository<ServiceWorkflowEntity>,
    @InjectRepository(WorkflowStepEntity)
    private readonly stepRepo: Repository<WorkflowStepEntity>,
  ) {}

  // ─── Workflow CRUD ─────────────────────────────────────────────────────────

  async findAll(query: {
    subServiceId?: string;
    packageId?: string;
    isActive?: boolean;
  }): Promise<ServiceWorkflowEntity[]> {
    const qb = this.workflowRepo
      .createQueryBuilder('wf')
      .leftJoinAndSelect('wf.steps', 'steps')
      .orderBy('wf.sortOrder', 'ASC')
      .addOrderBy('steps.stepOrder', 'ASC');

    if (query.subServiceId) {
      qb.andWhere('wf.subServiceId = :subServiceId', {
        subServiceId: query.subServiceId,
      });
    }
    if (query.packageId) {
      qb.andWhere('wf.packageId = :packageId', {
        packageId: query.packageId,
      });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('wf.isActive = :isActive', { isActive: query.isActive });
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<ServiceWorkflowEntity> {
    const workflow = await this.workflowRepo.findOne({
      where: { id },
      relations: ['steps'],
      order: { steps: { stepOrder: 'ASC' } },
    });
    if (!workflow) {
      throw new NotFoundException(`Workflow #${id} không tồn tại`);
    }
    return workflow;
  }

  async create(dto: CreateWorkflowDto): Promise<ServiceWorkflowEntity> {
    if (!dto.subServiceId && !dto.packageId) {
      throw new BadRequestException(
        'Workflow phải thuộc về ít nhất một subServiceId hoặc packageId',
      );
    }

    const workflow = this.workflowRepo.create({
      subServiceId: dto.subServiceId ?? null,
      packageId: dto.packageId ?? null,
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });

    const saved = await this.workflowRepo.save(workflow);

    // Tạo steps cùng lúc nếu có
    if (dto.steps && dto.steps.length > 0) {
      const steps = dto.steps.map((s, idx) =>
        this.stepRepo.create({
          workflowId: saved.id,
          stepOrder: s.stepOrder ?? idx + 1,
          title: s.title,
          description: s.description,
          durationMinutes: s.durationMinutes,
          isRequired: s.isRequired ?? true,
          icon: s.icon,
          checklistItems: s.checklistItems ?? [],
        }),
      );
      await this.stepRepo.save(steps);
    }

    return this.findOne(saved.id);
  }

  async update(
    id: string,
    dto: UpdateWorkflowDto,
  ): Promise<ServiceWorkflowEntity> {
    const workflow = await this.findOne(id);

    Object.assign(workflow, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      ...(dto.subServiceId !== undefined && { subServiceId: dto.subServiceId }),
      ...(dto.packageId !== undefined && { packageId: dto.packageId }),
    });

    await this.workflowRepo.save(workflow);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const workflow = await this.findOne(id);
    await this.workflowRepo.remove(workflow);
  }

  // ─── Step CRUD ────────────────────────────────────────────────────────────

  async addStep(
    workflowId: string,
    dto: CreateWorkflowStepDto,
  ): Promise<WorkflowStepEntity> {
    // Đảm bảo workflow tồn tại
    await this.findOne(workflowId);

    // Tự động tính stepOrder nếu không truyền
    let order = dto.stepOrder;
    if (!order) {
      const maxStep = await this.stepRepo
        .createQueryBuilder('s')
        .where('s.workflowId = :workflowId', { workflowId })
        .select('MAX(s.stepOrder)', 'max')
        .getRawOne<{ max: number | null }>();
      order = (maxStep?.max ?? 0) + 1;
    }

    const step = this.stepRepo.create({
      workflowId,
      stepOrder: order,
      title: dto.title,
      description: dto.description,
      durationMinutes: dto.durationMinutes,
      isRequired: dto.isRequired ?? true,
      icon: dto.icon,
      checklistItems: dto.checklistItems ?? [],
    });

    return this.stepRepo.save(step);
  }

  async updateStep(
    workflowId: string,
    stepId: string,
    dto: UpdateWorkflowStepDto,
  ): Promise<WorkflowStepEntity> {
    const step = await this.stepRepo.findOne({
      where: { id: stepId, workflowId },
    });
    if (!step) {
      throw new NotFoundException(
        `Step #${stepId} không tồn tại trong workflow #${workflowId}`,
      );
    }

    Object.assign(step, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.stepOrder !== undefined && { stepOrder: dto.stepOrder }),
      ...(dto.durationMinutes !== undefined && {
        durationMinutes: dto.durationMinutes,
      }),
      ...(dto.isRequired !== undefined && { isRequired: dto.isRequired }),
      ...(dto.icon !== undefined && { icon: dto.icon }),
      ...(dto.checklistItems !== undefined && {
        checklistItems: dto.checklistItems,
      }),
    });

    return this.stepRepo.save(step);
  }

  async removeStep(workflowId: string, stepId: string): Promise<void> {
    const step = await this.stepRepo.findOne({
      where: { id: stepId, workflowId },
    });
    if (!step) {
      throw new NotFoundException(
        `Step #${stepId} không tồn tại trong workflow #${workflowId}`,
      );
    }
    await this.stepRepo.remove(step);
  }

  /** Reorder tất cả steps của một workflow */
  async reorderSteps(
    workflowId: string,
    orderedIds: string[],
  ): Promise<WorkflowStepEntity[]> {
    await this.findOne(workflowId);

    const updates = orderedIds.map((id, idx) =>
      this.stepRepo.update({ id, workflowId }, { stepOrder: idx + 1 }),
    );
    await Promise.all(updates);

    return this.stepRepo.find({
      where: { workflowId },
      order: { stepOrder: 'ASC' },
    });
  }
}
