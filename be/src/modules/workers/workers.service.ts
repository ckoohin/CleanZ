import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkerEntity, WorkerStatus } from './entities/worker.entity';
import { UpdateWorkerProfileDto } from './dto/update-worker-profile.dto';
import { WorkerProfileResponseDto } from './dto/worker-profile-response.dto';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { UserRole } from 'src/common/enums/user-role.enum';

import { User } from '../users/entities/user.entity';
import { WorkerDocumentEntity } from './entities/worker-document.entity';
import { WorkerDocumentType } from 'src/common/enums/type-docs-worker.enum';
import { assertCanAccess, assertCanUpdate } from 'src/common/helpers/file.helper';
import { UploadService } from '../upload/upload.service';
import { toWorkerProfileResponseDto } from './mapper/worker.mapper';

const VALID_DOCUMENT_TYPES = ['citizenCard', 'certificate'] as const;
type DocumentType = (typeof VALID_DOCUMENT_TYPES)[number];

@Injectable()
export class WorkersService {
  constructor(
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(WorkerDocumentEntity)
    private readonly workerDocumentRepository: Repository<WorkerDocumentEntity>,
    private readonly uploadService: UploadService,
  ) { }

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

      let savedProfile;
      try {
        savedProfile = await this.workerRepository.save(newProfile);
      } catch (error: any) {
        if (error?.code === '23505') {
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
    return asyncHandleOperation(async () => {
      const workerProfile = await this.findAndAuthorizeWithCleanup(
        id,
        [],
        requestUserId,
        requestUserRole,
      );
      const oldAvatarPublicId = workerProfile.avatarPublicId;
      const uploadResult = await this.uploadService.uploadImage(file);

      workerProfile.avatarPublicId = uploadResult.public_id;
      workerProfile.avatarUrl = uploadResult.url;
      const updated = await this.workerRepository.save(workerProfile);

      if (oldAvatarPublicId) {
        await this.uploadService.deleteImage(oldAvatarPublicId).catch(() => { });
      }
      return toWorkerProfileResponseDto(updated);
    }, 'Lỗi khi cập nhật avatar');
  }

  async updateDocuments(
    id: string,
    files: {
      citizenCardImage?: Express.Multer.File[];
      certificateImage?: Express.Multer.File[];
    },
    requestUserId: string,
    requestUserRole: UserRole,
  ): Promise<WorkerProfileResponseDto> {
    // No local paths, just check file count
    const fileCount =
      (files?.citizenCardImage?.length || 0) +
      (files?.certificateImage?.length || 0);

    return asyncHandleOperation(async () => {
      const workerProfile = await this.findAndAuthorizeWithCleanup(
        id,
        [],
        requestUserId,
        requestUserRole,
      );

      if (
        workerProfile.status === WorkerStatus.APPROVED &&
        fileCount > 0
      ) {
        throw new ForbiddenException(
          'Không thể thay đổi giấy tờ sau khi đã được xác nhận',
        );
      }

      const deleteOldDocs = async (type: WorkerDocumentType, newCount: number) => {
        if (newCount > 0) {
          const oldDocs = await this.workerDocumentRepository.find({
            where: { worker: { id: workerProfile.id }, type },
          });
          for (const doc of oldDocs) {
            if (doc.filePublicId) {
              await this.uploadService.deleteImage(doc.filePublicId).catch(() => { });
            }
            await this.workerDocumentRepository.remove(doc);
          }
        }
      };

      await deleteOldDocs(WorkerDocumentType.CITIZEN_CARD, files?.citizenCardImage?.length || 0);
      await deleteOldDocs(WorkerDocumentType.CERTIFICATE, files?.certificateImage?.length || 0);

      const newDocs: WorkerDocumentEntity[] = [];
      if (files?.citizenCardImage) {
        for (const file of files.citizenCardImage) {
          const uploadResult = await this.uploadService.uploadImage(file);
          const doc = this.workerDocumentRepository.create({
            worker: workerProfile,
            type: WorkerDocumentType.CITIZEN_CARD,
            fileUrl: uploadResult.url,
            filePublicId: uploadResult.public_id,
          });
          newDocs.push(doc);
        }
      }
      if (files?.certificateImage) {
        for (const file of files.certificateImage) {
          const uploadResult = await this.uploadService.uploadImage(file);
          const doc = this.workerDocumentRepository.create({
            worker: workerProfile,
            type: WorkerDocumentType.CERTIFICATE,
            fileUrl: uploadResult.url,
            filePublicId: uploadResult.public_id,
          });
          newDocs.push(doc);
        }
      }
      if (newDocs.length > 0) {
        await this.workerDocumentRepository.save(newDocs);
      }

      return toWorkerProfileResponseDto(
        await this.findWorkerOrFail(workerProfile.id),
      );
    }, 'Lỗi khi cập nhật giấy tờ worker');
  }

  async getDocumentPaths(
    id: string,
    type: string,
    requestUserId: string,
    requestUserRole: UserRole,
  ): Promise<string[]> {
    if (!VALID_DOCUMENT_TYPES.includes(type as DocumentType)) {
      throw new BadRequestException(
        `Loại giấy tờ không hợp lệ. Chỉ chấp nhận: ${VALID_DOCUMENT_TYPES.join(', ')}`,
      );
    }

    const workerProfile = await this.findWorkerOrFail(id);
    assertCanUpdate(workerProfile, requestUserId, requestUserRole);

    const docs = await this.workerDocumentRepository.find({
      where: { worker: { id }, type: type as WorkerDocumentType },
    });
    if (!docs.length) {
      throw new NotFoundException('Chưa có ảnh giấy tờ này');
    }
    return docs.map((d) => d.fileUrl);
  }

  async approveWorker(
    id: string,
    adminId: string,
  ): Promise<WorkerProfileResponseDto> {
    return asyncHandleOperation(async () => {
      const workerProfile = await this.findWorkerOrFail(id);
      console.log(workerProfile)
      if (workerProfile.status === WorkerStatus.APPROVED) {
        throw new BadRequestException('Worker đã được phê duyệt trước đó');
      }
      workerProfile.status = WorkerStatus.APPROVED;
      workerProfile.lastChangedByAdminId = adminId;
      const updated = await this.workerRepository.save(workerProfile);
      let adminName: string | undefined = undefined;
      if (updated.lastChangedByAdminId) {
        const admin = await this.userRepository.findOne({
          where: { id: updated.lastChangedByAdminId },
        });
        adminName = admin?.fullName;
      }
      return toWorkerProfileResponseDto({
        ...updated,
        lastChangedByAdminName: adminName,
      });
    }, 'Lỗi khi phê duyệt worker');
  }

  async rejectWorker(
    id: string,
    adminId: string,
  ): Promise<WorkerProfileResponseDto> {
    return asyncHandleOperation(async () => {
      const workerProfile = await this.findWorkerOrFail(id);
      if (workerProfile.status === WorkerStatus.REJECTED) {
        throw new BadRequestException('Worker đã bị từ chối trước đó');
      }
      workerProfile.status = WorkerStatus.REJECTED;
      workerProfile.lastChangedByAdminId = adminId;
      const updated = await this.workerRepository.save(workerProfile);
      let adminName: string | undefined = undefined;
      if (updated.lastChangedByAdminId) {
        const admin = await this.userRepository.findOne({
          where: { id: updated.lastChangedByAdminId },
        });
        adminName = admin?.fullName;
      }
      return toWorkerProfileResponseDto({
        ...updated,
        lastChangedByAdminName: adminName,
      });
    }, 'Lỗi khi từ chối worker');
  }

  async getAllWorkerDocuments(
    workerId: string,
    requestUserId: string,
    requestUserRole: UserRole,
  ) {
    const worker = await this.workerRepository.findOne({
      where: { id: workerId },
      relations: ['user', 'documents'],
    });
    if (!worker) throw new NotFoundException('Không tìm thấy worker');
    if (
      requestUserRole !== UserRole.ADMIN &&
      worker.user.id !== requestUserId
    ) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập tài nguyên này',
      );
    }
    return {
      documents: (worker.documents || []).map((doc) => ({
        id: doc.id,
        type: doc.type,
        fileUrl: doc.fileUrl || null,
        filePublicId: doc.filePublicId || null,
        createdAt: doc.createdAt,
      })),
    };
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

  private async findAndAuthorizeWithCleanup(
    id: string,
    filePaths: (string | undefined)[],
    requestUserId: string,
    requestUserRole: UserRole,
  ): Promise<WorkerEntity> {
    const cleanPaths = filePaths.filter(Boolean) as string[];

    const worker = await this.workerRepository.findOne({
      where: { id },
      relations: ['user', 'documents'],
    });

    if (!worker) {
      throw new NotFoundException('Không tìm thấy thông tin worker');
    }

    try {
      assertCanUpdate(worker, requestUserId, requestUserRole);
    } catch (e) {
      throw e;
    }

    return worker;
  }
}
