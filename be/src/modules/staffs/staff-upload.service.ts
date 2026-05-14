/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffEntity } from './entities/staff.entity';
import { StaffDocumentEntity } from './entities/staff-document.entity';
import { StaffDocumentType } from 'src/common/enums/type-docs-staff.enum';
import { APPROVAL_STATUS } from 'src/common/enums/approval-status.enum';
import { UserRole } from 'src/common/enums/user-role.enum';
import { assertCanUpdate } from 'src/common/helpers/file.helper';
import { UploadService } from '../upload/upload.service';
import { StaffProfileResponseDto } from './dto/staff-profile-response.dto';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { toStaffProfileResponseDto } from './mapper/staff.mapper';

const VALID_DOCUMENT_TYPES = ['citizenCard', 'certificate'] as const;
type DocumentType = (typeof VALID_DOCUMENT_TYPES)[number];

@Injectable()
export class StaffUploadService {
  constructor(
    @InjectRepository(StaffEntity)
    private readonly staffRepository: Repository<StaffEntity>,
    @InjectRepository(StaffDocumentEntity)
    private readonly staffDocumentRepository: Repository<StaffDocumentEntity>,
    private readonly uploadService: UploadService,
  ) {}

  async updateAvatar(
    id: string,
    file: Express.Multer.File,
    requestUserId: string,
    requestUserRole: UserRole,
  ): Promise<StaffProfileResponseDto> {
    return asyncHandleOperation(async () => {
      const staffProfile = await this.findAndAuthorize(
        id,
        requestUserId,
        requestUserRole,
      );
      const oldAvatarPublicId = staffProfile.avatarPublicId;
      const uploadResult = await this.uploadService.uploadImage(file);

      staffProfile.avatarPublicId = uploadResult.public_id;
      staffProfile.avatarUrl = uploadResult.url;
      const updated = await this.staffRepository.save(staffProfile);

      if (oldAvatarPublicId) {
        await this.uploadService.deleteImage(oldAvatarPublicId).catch(() => {});
      }
      return toStaffProfileResponseDto(updated);
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
  ): Promise<StaffProfileResponseDto> {
    const fileCount =
      (files?.citizenCard?.length || 0) + (files?.certificate?.length || 0);

    return asyncHandleOperation(async () => {
      const staffProfile = await this.findAndAuthorize(
        id,
        requestUserId,
        requestUserRole,
      );

      if (
        staffProfile.approvalStatus === APPROVAL_STATUS.APPROVED &&
        fileCount > 0
      ) {
        throw new ForbiddenException(
          'Không thể thay đổi giấy tờ sau khi đã được xác nhận',
        );
      }

      const deleteOldDocs = async (
        type: StaffDocumentType,
        newCount: number,
      ) => {
        if (newCount > 0) {
          const oldDocs = await this.staffDocumentRepository.find({
            where: { staff: { id: staffProfile.id }, type },
          });
          await Promise.all(
            oldDocs
              .filter((d) => d.filePublicId)
              .map((d) =>
                this.uploadService.deleteImage(d.filePublicId!).catch(() => {}),
              ),
          );
          await this.staffDocumentRepository.delete({
            staff: { id: staffProfile.id },
            type,
          });
        }
      };

      await Promise.all([
        deleteOldDocs(
          StaffDocumentType.CITIZEN_CARD,
          files?.citizenCard?.length || 0,
        ),
        deleteOldDocs(
          StaffDocumentType.CERTIFICATE,
          files?.certificate?.length || 0,
        ),
      ]);

      const uploadTasks: Promise<StaffDocumentEntity>[] = [];

      if (files?.citizenCard) {
        for (const file of files.citizenCard) {
          uploadTasks.push(
            this.uploadService.uploadImage(file).then((result) =>
              this.staffDocumentRepository.create({
                staff: staffProfile,
                type: StaffDocumentType.CITIZEN_CARD,
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
              this.staffDocumentRepository.create({
                staff: staffProfile,
                type: StaffDocumentType.CERTIFICATE,
                fileUrl: result.url,
                filePublicId: result.public_id,
              }),
            ),
          );
        }
      }

      if (uploadTasks.length > 0) {
        const newDocs = await Promise.all(uploadTasks);
        await this.staffDocumentRepository.save(newDocs);
      }

      return toStaffProfileResponseDto(
        await this.findStaffOrFail(staffProfile.id),
      );
    }, 'Lỗi khi cập nhật giấy tờ staff');
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

    const staffProfile = await this.findStaffOrFail(id);
    assertCanUpdate(staffProfile, requestUserId, requestUserRole);

    const docs = await this.staffDocumentRepository.find({
      where: { staff: { id }, type: type as StaffDocumentType },
    });
    if (!docs.length) {
      throw new NotFoundException('Chưa có ảnh giấy tờ này');
    }
    return docs.map((d) => d.fileUrl);
  }

  async getAllStaffDocuments(
    staffId: string,
    requestUserId: string,
    requestUserRole: UserRole,
  ) {
    const staff = await this.staffRepository.findOne({
      where: { id: staffId },
      relations: ['user', 'documents'],
    });
    if (!staff) throw new NotFoundException('Không tìm thấy staff');
    if (requestUserRole !== UserRole.ADMIN && staff.user.id !== requestUserId) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập tài nguyên này',
      );
    }
    return {
      documents: (staff.documents || []).map((doc) => ({
        id: doc.id,
        type: doc.type,
        fileUrl: doc.fileUrl || null,
        createdAt: doc.createdAt,
      })),
    };
  }

  // ─── Private helpers ─────────────────────────────────────

  private async findStaffOrFail(id: string): Promise<StaffEntity> {
    const staff = await this.staffRepository.findOne({
      where: { id },
      relations: ['user', 'documents'],
    });
    if (!staff) {
      throw new NotFoundException('Không tìm thấy thông tin staff');
    }
    return staff;
  }

  private async findAndAuthorize(
    id: string,
    requestUserId: string,
    requestUserRole: UserRole,
  ): Promise<StaffEntity> {
    const staff = await this.staffRepository.findOne({
      where: { id },
      relations: ['user', 'documents'],
    });
    if (!staff) {
      throw new NotFoundException('Không tìm thấy thông tin staff');
    }
    assertCanUpdate(staff, requestUserId, requestUserRole);
    return staff;
  }
}
