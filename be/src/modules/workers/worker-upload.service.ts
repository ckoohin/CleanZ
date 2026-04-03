import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkerEntity } from './entities/worker.entity';
import { WorkerDocumentEntity } from './entities/worker-document.entity';
import { WorkerDocumentType } from 'src/common/enums/type-docs-worker.enum';
import { APPROVAL_STATUS } from 'src/common/enums/approval-status.enum';
import { UserRole } from 'src/common/enums/user-role.enum';
import { assertCanUpdate } from 'src/common/helpers/file.helper';
import { UploadService } from '../upload/upload.service';
import { WorkerProfileResponseDto } from './dto/worker-profile-response.dto';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { toWorkerProfileResponseDto } from './mapper/worker.mapper';

const VALID_DOCUMENT_TYPES = ['citizenCard', 'certificate'] as const;
type DocumentType = (typeof VALID_DOCUMENT_TYPES)[number];

@Injectable()
export class WorkerUploadService {
  constructor(
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    @InjectRepository(WorkerDocumentEntity)
    private readonly workerDocumentRepository: Repository<WorkerDocumentEntity>,
    private readonly uploadService: UploadService,
  ) {}

  async updateAvatar(
    id: string,
    file: Express.Multer.File,
    requestUserId: string,
    requestUserRole: UserRole,
  ): Promise<WorkerProfileResponseDto> {
    return asyncHandleOperation(async () => {
      const workerProfile = await this.findAndAuthorize(
        id,
        requestUserId,
        requestUserRole,
      );
      const oldAvatarPublicId = workerProfile.avatarPublicId;
      const uploadResult = await this.uploadService.uploadImage(file);

      workerProfile.avatarPublicId = uploadResult.public_id;
      workerProfile.avatarUrl = uploadResult.url;
      const updated = await this.workerRepository.save(workerProfile);

      if (oldAvatarPublicId) {
        await this.uploadService.deleteImage(oldAvatarPublicId).catch(() => {});
      }
      return toWorkerProfileResponseDto(updated);
    }, 'Lỗi khi cập nhật avatar');
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
    const fileCount =
      (files?.citizenCard?.length || 0) + (files?.certificate?.length || 0);

    return asyncHandleOperation(async () => {
      const workerProfile = await this.findAndAuthorize(
        id,
        requestUserId,
        requestUserRole,
      );

      if (
        workerProfile.approvalStatus === APPROVAL_STATUS.APPROVED &&
        fileCount > 0
      ) {
        throw new ForbiddenException(
          'Không thể thay đổi giấy tờ sau khi đã được xác nhận',
        );
      }

      const deleteOldDocs = async (
        type: WorkerDocumentType,
        newCount: number,
      ) => {
        if (newCount > 0) {
          const oldDocs = await this.workerDocumentRepository.find({
            where: { worker: { id: workerProfile.id }, type },
          });
          await Promise.all(
            oldDocs
              .filter((d) => d.filePublicId)
              .map((d) =>
                this.uploadService.deleteImage(d.filePublicId!).catch(() => {}),
              ),
          );
          await this.workerDocumentRepository.delete({
            worker: { id: workerProfile.id },
            type,
          });
        }
      };

      await Promise.all([
        deleteOldDocs(
          WorkerDocumentType.CITIZEN_CARD,
          files?.citizenCard?.length || 0,
        ),
        deleteOldDocs(
          WorkerDocumentType.CERTIFICATE,
          files?.certificate?.length || 0,
        ),
      ]);

      const uploadTasks: Promise<WorkerDocumentEntity>[] = [];

      if (files?.citizenCard) {
        for (const file of files.citizenCard) {
          uploadTasks.push(
            this.uploadService.uploadImage(file).then((result) =>
              this.workerDocumentRepository.create({
                worker: workerProfile,
                type: WorkerDocumentType.CITIZEN_CARD,
                fileUrl: result.url,
                filePublicId: result.public_id,
              }),
            ),
          );
        }
      }
      if (files?.certificate) {
        for (const file of files.certificate) {
          uploadTasks.push(
            this.uploadService.uploadImage(file).then((result) =>
              this.workerDocumentRepository.create({
                worker: workerProfile,
                type: WorkerDocumentType.CERTIFICATE,
                fileUrl: result.url,
                filePublicId: result.public_id,
              }),
            ),
          );
        }
      }

      if (uploadTasks.length > 0) {
        const newDocs = await Promise.all(uploadTasks);
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

  private async findAndAuthorize(
    id: string,
    requestUserId: string,
    requestUserRole: UserRole,
  ): Promise<WorkerEntity> {
    const worker = await this.workerRepository.findOne({
      where: { id },
      relations: ['user', 'documents'],
    });
    if (!worker) {
      throw new NotFoundException('Không tìm thấy thông tin worker');
    }
    assertCanUpdate(worker, requestUserId, requestUserRole);
    return worker;
  }
}
