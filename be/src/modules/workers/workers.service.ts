import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkerEntity } from './entities/worker.entity';
import { UpdateWorkerProfileDto } from './dto/update-worker-profile.dto';
import { WorkerProfileResponseDto } from './dto/worker-profile-response.dto';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { UserRole } from 'src/common/enums/user-role.enum';
import { APPROVAL_STATUS } from 'src/common/enums/approval-status.enum';
import { User } from '../users/entities/user.entity';
import { WorkerPresenceEntity } from './entities/worker-presence.entity';
import { WORKER_PRESENCE_STATUS } from 'src/common/enums/worker-presence-status.enum';
import {
  assertCanAccess,
  assertCanUpdate,
} from 'src/common/helpers/file.helper';
import { MailService } from '../mail/mail.service';
import { toWorkerProfileResponseDto } from './mapper/worker.mapper';
import { WorkerPresenceResponseDto } from './dto/worker-presence-response.dto';
import { UpdateWorkerPresenceDto } from './dto/update-worker-presence.dto';
import { DataSource } from 'typeorm';
import { WorkerUploadService } from './worker-upload.service';
import { WorkerServiceEntity } from './entities/worker-service.entity';
import { ServiceEntity } from '../services/entities/service.entity';
import { CreateWorkerServiceDto } from './dto/create-worker-service.dto';
import { UpdateWorkerServiceDto } from './dto/update-worker-service.dto';
import { ServiceLocationType } from 'src/common/enums/service-location-type.enum';
import {
  toWorkerServiceResponseDto,
  toWorkerServiceResponseDtoList,
} from './mapper/worker-service.mapper';
import { WorkerDocumentEntity } from './entities/worker-document.entity';
import { UploadService } from '../upload/upload.service';

const VALID_DOCUMENT_TYPES = ['citizenCard', 'certificate'] as const;
type DocumentType = (typeof VALID_DOCUMENT_TYPES)[number];

@Injectable()
export class WorkersService {
  constructor(
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(WorkerPresenceEntity)
    private readonly workerPresenceRepository: Repository<WorkerPresenceEntity>,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
    private readonly workerUploadService: WorkerUploadService,
    @InjectRepository(WorkerDocumentEntity)
    private readonly workerDocumentRepository: Repository<WorkerDocumentEntity>,
    @InjectRepository(WorkerServiceEntity)
    private readonly workerServiceRepository: Repository<WorkerServiceEntity>,
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
    private readonly uploadService: UploadService,
  ) {}

  async createProfileWorker(
    userId: string,
    requestUserId: string,
    requestUserRole: UserRole,
  ): Promise<WorkerProfileResponseDto> {
    return asyncHandleOperation(async () => {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('Người dùng không tồn tại');
      }

      assertCanAccess(
        requestUserId,
        userId,
        requestUserRole,
        'Bạn không có quyền tạo hồ sơ worker cho người dùng khác',
      );

      const existingProfile = await this.workerRepository.findOne({
        where: { user: { id: userId } },
        relations: ['user'],
      });

      if (existingProfile) {
        throw new ConflictException('Hồ sơ đã tồn tại.');
      }

      const newProfile = this.workerRepository.create({
        user: { id: userId },
      });

      let savedProfile: WorkerEntity;
      try {
        savedProfile = await this.workerRepository.save(newProfile);
      } catch (error: unknown) {
        const err = error as { code?: string };
        if (err.code === '23505') {
          throw new ConflictException('Hồ sơ đã tồn tại.');
        }
        throw error;
      }
      return toWorkerProfileResponseDto(
        await this.findWorkerOrFail(savedProfile.id),
      );
    }, 'Lỗi khi tạo hồ sơ worker');
  }
  async getProfileWorker(
    requestUserId: string,
    requestUserRole: UserRole,
  ): Promise<WorkerProfileResponseDto> {
    const worker = await this.workerRepository.findOne({
      where: { user: { id: requestUserId } },
      relations: ['user', 'documents'],
    });
    if (!worker) throw new NotFoundException('Không tìm thấy hồ sơ worker');
    if (
      requestUserRole !== UserRole.ADMIN &&
      worker.user.id !== requestUserId
    ) {
      throw new ForbiddenException('Bạn không có quyền truy cập hồ sơ này');
    }
    return toWorkerProfileResponseDto(worker);
  }
  async update(
    id: string,
    dto: UpdateWorkerProfileDto,
    requestUserId: string,
    requestUserRole: UserRole,
  ): Promise<WorkerProfileResponseDto> {
    return asyncHandleOperation(async () => {
      const workerProfile = await this.findWorkerOrFail(id);
      assertCanUpdate(workerProfile, requestUserId, requestUserRole);

      Object.assign(workerProfile, dto);
      const updated = await this.workerRepository.save(workerProfile);

      return toWorkerProfileResponseDto(updated);
    }, 'Lỗi khi cập nhật thông tin worker');
  }

  async updateAvatar(
    id: string,
    file: Express.Multer.File,
    requestUserId: string,
    requestUserRole: UserRole,
  ): Promise<WorkerProfileResponseDto> {
    return this.workerUploadService.updateAvatar(
      id,
      file,
      requestUserId,
      requestUserRole,
    );
  }

  async updateDocuments(
    id: string,
    files: {
      citizenCard?: Express.Multer.File[];
      certificate?: Express.Multer.File[];
    },
    requestUserId: string,
    requestUserRole: UserRole,
  ): Promise<WorkerProfileResponseDto> {
    return this.workerUploadService.updateDocuments(
      id,
      files,
      requestUserId,
      requestUserRole,
    );
  }

  async getDocumentPaths(
    id: string,
    type: string,
    requestUserId: string,
    requestUserRole: UserRole,
  ): Promise<string[]> {
    return this.workerUploadService.getDocumentPaths(
      id,
      type,
      requestUserId,
      requestUserRole,
    );
  }

  async approveWorker(
    id: string,
    adminId: string,
  ): Promise<{ message: string; worker: WorkerProfileResponseDto }> {
    return asyncHandleOperation(async () => {
      const workerProfile = await this.findWorkerOrFail(id);
      if (workerProfile.approvalStatus === APPROVAL_STATUS.APPROVED) {
        throw new BadRequestException('Worker đã được phê duyệt trước đó');
      }
      let adminName: string | undefined = undefined;
      let userEmail: string = workerProfile.user.email;
      let userFullName: string = workerProfile.user.fullName;

      await this.dataSource.transaction(async (tx) => {
        workerProfile.approvalStatus = APPROVAL_STATUS.APPROVED;
        workerProfile.lastChangedByAdminId = adminId;
        const admin = await tx.findOne(User, {
          where: { id: adminId },
          select: ['id', 'fullName'],
        });
        adminName = admin?.fullName;
        await tx.save(workerProfile);
        const user = await tx.findOne(User, {
          where: { id: workerProfile.user.id },
        });
        if (!user) throw new NotFoundException('Người dùng không tồn tại');
        userEmail = user.email;
        userFullName = user.fullName;
        user.role = UserRole.WORKER;
        await tx.save(user);

        const existingPresence = await tx.findOne(WorkerPresenceEntity, {
          where: { worker: { id: workerProfile.id } },
        });

        if (!existingPresence) {
          const workerPresence = tx.create(WorkerPresenceEntity, {
            worker: workerProfile,
            status: WORKER_PRESENCE_STATUS.OFFLINE,
            isBusy: false,
          });
          await tx.save(workerPresence);
        }
      });
      const finalWorker = await this.findWorkerOrFail(id);
      await this.mailService
        .sendWorkerApprovedEmail(userEmail, userFullName)
        .catch(() => {});

      return {
        message: 'Phê duyệt hồ sơ worker thành công',
        worker: toWorkerProfileResponseDto({
          ...finalWorker,
          lastChangedByAdminName: adminName,
        }),
      };
    }, 'Lỗi khi phê duyệt worker');
  }
  async rejectWorker(
    id: string,
    adminId: string,
  ): Promise<{ message: string; worker: WorkerProfileResponseDto }> {
    return asyncHandleOperation(async () => {
      const workerProfile = await this.findWorkerOrFail(id);
      if (workerProfile.approvalStatus === APPROVAL_STATUS.REJECTED) {
        throw new BadRequestException('Worker đã bị từ chối trước đó');
      }

      let adminName: string | undefined = undefined;
      const userEmail = workerProfile.user.email;
      const userFullName = workerProfile.user.fullName;

      await this.dataSource.transaction(async (tx) => {
        workerProfile.approvalStatus = APPROVAL_STATUS.REJECTED;
        workerProfile.lastChangedByAdminId = adminId;

        const admin = await tx.findOne(User, {
          where: { id: adminId },
          select: ['id', 'fullName'],
        });
        adminName = admin?.fullName;
        await tx.save(workerProfile);
        const user = await tx.findOne(User, {
          where: { id: workerProfile.user.id },
        });
        if (!user) throw new NotFoundException('Người dùng không tồn tại');
        user.role = UserRole.CUSTOMER;
        await tx.save(user);
      });
      const finalWorker = await this.findWorkerOrFail(id);
      await this.mailService
        .sendWorkerRejectedEmail(userEmail, userFullName)
        .catch(() => {});

      return {
        message: 'Từ chối hồ sơ worker thành công',
        worker: toWorkerProfileResponseDto({
          ...finalWorker,
          lastChangedByAdminName: adminName,
        }),
      };
    }, 'Lỗi khi từ chối worker');
  }

  async getMyPresence(
    userId: string,
    userRole: UserRole,
  ): Promise<WorkerPresenceResponseDto> {
    return asyncHandleOperation(async () => {
      const workerProfile = await this.findApprovedWorkerByUserOrFail(
        userId,
        userRole,
      );
      const workerPresence =
        await this.getOrCreateWorkerPresence(workerProfile);

      return this.toWorkerPresenceResponseDto(workerPresence);
    }, 'Lỗi khi lấy trạng thái hoạt động của worker');
  }

  async updateMyPresence(
    userId: string,
    userRole: UserRole,
    dto: UpdateWorkerPresenceDto,
  ): Promise<WorkerPresenceResponseDto> {
    return asyncHandleOperation(async () => {
      const workerProfile = await this.findApprovedWorkerByUserOrFail(
        userId,
        userRole,
      );
      const workerPresence =
        await this.getOrCreateWorkerPresence(workerProfile);

      workerPresence.status = dto.status;
      const updatedPresence =
        await this.workerPresenceRepository.save(workerPresence);

      return this.toWorkerPresenceResponseDto(updatedPresence);
    }, 'Lỗi khi cập nhật trạng thái hoạt động của worker');
  }

  async getAllWorkerDocuments(
    workerId: string,
    requestUserId: string,
    requestUserRole: UserRole,
  ) {
    return this.workerUploadService.getAllWorkerDocuments(
      workerId,
      requestUserId,
      requestUserRole,
    );
  }

  async findWorkerById(
    id: string,
    requestUserId: string,
    requestUserRole: UserRole,
  ): Promise<WorkerProfileResponseDto> {
    const worker = await this.findWorkerOrFail(id);

    if (requestUserRole === UserRole.ADMIN) {
      return toWorkerProfileResponseDto(worker);
    }

    if (worker.user.id === requestUserId) {
      return toWorkerProfileResponseDto(worker);
    }

    if (worker.approvalStatus !== APPROVAL_STATUS.APPROVED) {
      throw new NotFoundException('Không tìm thấy thông tin worker');
    }

    return toWorkerProfileResponseDto(worker);
  }

  // ─── Private helpers ─────────────────────────────────────

  private async findWorkerOrFail(id: string): Promise<WorkerEntity> {
    const worker = await this.workerRepository.findOne({
      where: { id },
      relations: ['user', 'documents'],
    });
    if (!worker) {
      throw new NotFoundException('Không tìm thấy thông tin worker');
    }
    return worker;
  }

  private async findWorkerByUserId(
    userId: string,
  ): Promise<WorkerEntity | null> {
    return this.workerRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user', 'documents', 'workerPresence'],
    });
  }

  private async findApprovedWorkerByUserOrFail(
    userId: string,
    userRole: UserRole,
  ): Promise<WorkerEntity> {
    if (userRole !== UserRole.WORKER) {
      throw new ForbiddenException('Bạn không thể thực hiện hành động này.');
    }

    const worker = await this.findWorkerByUserId(userId);

    if (!worker) {
      throw new NotFoundException('Không tìm thấy hồ sơ worker');
    }

    if (worker.approvalStatus !== APPROVAL_STATUS.APPROVED) {
      throw new ForbiddenException(
        'Worker chưa được phê duyệt để bật trạng thái hoạt động',
      );
    }

    return worker;
  }

  private async getOrCreateWorkerPresence(
    worker: WorkerEntity,
  ): Promise<WorkerPresenceEntity> {
    const existingPresence = await this.workerPresenceRepository.findOne({
      where: { worker: { id: worker.id } },
      relations: ['worker'],
    });

    if (existingPresence) {
      return existingPresence;
    }

    const workerPresence = this.workerPresenceRepository.create({
      worker,
      status: WORKER_PRESENCE_STATUS.OFFLINE,
      isBusy: false,
    });

    return this.workerPresenceRepository.save(workerPresence);
  }

  private toWorkerPresenceResponseDto(
    workerPresence: WorkerPresenceEntity,
  ): WorkerPresenceResponseDto {
    return {
      workerId: workerPresence.worker.id,
      status: workerPresence.status,
      isBusy: workerPresence.isBusy,
      createdAt: workerPresence.createdAt,
      updatedAt: workerPresence.updatedAt,
    };
  }
  // ─── Worker Services CRUD ───────────────────────────────

  async createWorkerService(
    workerId: string,
    dto: CreateWorkerServiceDto,
    requestUserId: string,
    requestUserRole: UserRole,
  ) {
    return asyncHandleOperation(async () => {
      const worker = await this.findWorkerOrFail(workerId);
      assertCanUpdate(worker, requestUserId, requestUserRole);

      const service = await this.serviceRepository.findOne({
        where: { id: dto.serviceId, isActive: true },
      });
      if (!service) {
        throw new NotFoundException(
          'Không tìm thấy dịch vụ hoặc dịch vụ đã bị ẩn',
        );
      }

      // Validate locationTypes là subset của service.supportedLocationTypes
      const invalidTypes = dto.locationTypes.filter(
        (lt) => !service.supportedLocationTypes.includes(lt),
      );
      if (invalidTypes.length > 0) {
        throw new BadRequestException(
          `Dịch vụ "${service.name}" không hỗ trợ loại: ${invalidTypes.join(', ')}. Chỉ hỗ trợ: ${service.supportedLocationTypes.join(', ')}`,
        );
      }

      // Validate shopAddress bắt buộc khi có AT_SHOP
      if (
        dto.locationTypes.includes(ServiceLocationType.AT_SHOP) &&
        !dto.shopAddress
      ) {
        throw new BadRequestException(
          'Địa chỉ quán bắt buộc khi dịch vụ tại quán (at_shop)',
        );
      }

      // Kiểm tra đã đăng ký dịch vụ này chưa
      const existing = await this.workerServiceRepository.findOne({
        where: {
          worker: { id: workerId },
          service: { id: dto.serviceId },
        },
      });
      if (existing) {
        throw new ConflictException('Bạn đã đăng ký dịch vụ này rồi');
      }

      const workerService = this.workerServiceRepository.create({
        worker: { id: workerId } as WorkerEntity,
        service: { id: dto.serviceId } as ServiceEntity,
        locationTypes: dto.locationTypes,
        customPrice: dto.customPrice,
        description: dto.description,
        shopAddress: dto.shopAddress,
      });

      const saved = await this.workerServiceRepository.save(workerService);

      // Reload with relations
      const result = await this.workerServiceRepository.findOne({
        where: { id: saved.id },
        relations: ['service'],
      });

      return toWorkerServiceResponseDto(result!);
    }, 'Lỗi khi đăng ký dịch vụ cho worker');
  }

  async getWorkerServices(workerId: string) {
    const worker = await this.workerRepository.findOne({
      where: { id: workerId },
    });
    if (!worker) {
      throw new NotFoundException('Không tìm thấy worker');
    }

    const workerServices = await this.workerServiceRepository.find({
      where: { worker: { id: workerId }, isAvailable: true },
      relations: ['service'],
      order: { createdAt: 'DESC' },
    });

    return toWorkerServiceResponseDtoList(workerServices);
  }

  async updateWorkerService(
    workerId: string,
    workerServiceId: string,
    dto: UpdateWorkerServiceDto,
    requestUserId: string,
    requestUserRole: UserRole,
  ) {
    return asyncHandleOperation(async () => {
      const worker = await this.findWorkerOrFail(workerId);
      assertCanUpdate(worker, requestUserId, requestUserRole);

      const workerService = await this.workerServiceRepository.findOne({
        where: { id: workerServiceId, worker: { id: workerId } },
        relations: ['service'],
      });
      if (!workerService) {
        throw new NotFoundException('Không tìm thấy dịch vụ đã đăng ký');
      }

      // Validate locationTypes nếu có update
      if (dto.locationTypes) {
        const invalidTypes = dto.locationTypes.filter(
          (lt) => !workerService.service.supportedLocationTypes.includes(lt),
        );
        if (invalidTypes.length > 0) {
          throw new BadRequestException(
            `Dịch vụ "${workerService.service.name}" không hỗ trợ loại: ${invalidTypes.join(', ')}`,
          );
        }

        // Validate shopAddress khi chuyển sang AT_SHOP
        if (
          dto.locationTypes.includes(ServiceLocationType.AT_SHOP) &&
          !dto.shopAddress &&
          !workerService.shopAddress
        ) {
          throw new BadRequestException(
            'Địa chỉ quán bắt buộc khi dịch vụ tại quán (at_shop)',
          );
        }
      }

      Object.assign(workerService, dto);
      const updated = await this.workerServiceRepository.save(workerService);

      return toWorkerServiceResponseDto(updated);
    }, 'Lỗi khi cập nhật dịch vụ worker');
  }

  async deleteWorkerService(
    workerId: string,
    workerServiceId: string,
    requestUserId: string,
    requestUserRole: UserRole,
  ) {
    return asyncHandleOperation(async () => {
      const worker = await this.findWorkerOrFail(workerId);
      assertCanUpdate(worker, requestUserId, requestUserRole);

      const workerService = await this.workerServiceRepository.findOne({
        where: { id: workerServiceId, worker: { id: workerId } },
      });
      if (!workerService) {
        throw new NotFoundException('Không tìm thấy dịch vụ đã đăng ký');
      }

      await this.workerServiceRepository.remove(workerService);

      return { message: 'Đã xóa dịch vụ thành công' };
    }, 'Lỗi khi xóa dịch vụ worker');
  }

  async findWorkerServiceById(id: string): Promise<WorkerServiceEntity> {
    const workerService = await this.workerServiceRepository.findOne({
      where: { id },
      relations: ['service', 'worker', 'worker.user'],
    });
    if (!workerService) {
      throw new NotFoundException('Không tìm thấy dịch vụ worker');
    }
    return workerService;
  }
}
