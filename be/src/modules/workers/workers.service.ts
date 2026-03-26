import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    ConflictException,
    HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkerEntity, WorkerStatus } from './worker.entity';
import { UpdateWorkerProfileDto } from './dto/update-worker-profile.dto';
import { WorkerProfileResponseDto } from './dto/worker-profile-response.dto';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { UserRole } from 'src/common/enums/user-role.enum';
import {
    normalizeUploadPath,
    type UploadedImageFile,
} from 'src/common/helpers/upload-image.helper';
import { User } from '../users/entities/user.entity';
import { unlinkSync, existsSync } from 'fs';

const VALID_DOCUMENT_TYPES = ['citizen-card', 'certificate'] as const;
type DocumentType = (typeof VALID_DOCUMENT_TYPES)[number];

@Injectable()
export class WorkersService {
    constructor(
        @InjectRepository(WorkerEntity)
        private readonly workerRepository: Repository<WorkerEntity>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
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

            this.assertCanAccess(requestUserId, userId, requestUserRole,
                'Bạn không có quyền tạo hồ sơ worker cho người dùng khác');

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
            return this.toResponse(await this.findWorkerOrFail(savedProfile.id));
        }, 'Lỗi khi tạo hồ sơ worker');
    }

    async update(
        id: string,
        dto: UpdateWorkerProfileDto,
        requestUserId: string,
        requestUserRole: UserRole,
    ): Promise<WorkerProfileResponseDto> {
        return asyncHandleOperation(async () => {
            const workerProfile = await this.findWorkerOrFail(id);
            this.assertCanUpdate(workerProfile, requestUserId, requestUserRole);

            Object.assign(workerProfile, dto);
            const updated = await this.workerRepository.save(workerProfile);

            return this.toResponse(updated);
        }, 'Lỗi khi cập nhật thông tin worker');
    }

    async updateAvatar(
        id: string,
        file: UploadedImageFile,
        requestUserId: string,
        requestUserRole: UserRole,
    ): Promise<WorkerProfileResponseDto> {
        return asyncHandleOperation(async () => {
            const workerProfile = await this.findAndAuthorizeWithCleanup(
                id, [file?.path], requestUserId, requestUserRole,
            );

            const oldAvatarPath = workerProfile.avatarPath;

            workerProfile.avatarPath = normalizeUploadPath(file);
            const updated = await this.workerRepository.save(workerProfile);

            this.deleteFile(oldAvatarPath);

            return this.toResponse(updated);
        }, 'Lỗi khi cập nhật avatar');
    }

    async updateDocuments(
        id: string,
        files: {
            citizenCardImage?: UploadedImageFile[];
            certificateImage?: UploadedImageFile[];
        },
        requestUserId: string,
        requestUserRole: UserRole,
    ): Promise<WorkerProfileResponseDto> {
        const uploadedPaths = [
            files?.citizenCardImage?.[0]?.path,
            files?.certificateImage?.[0]?.path,
        ].filter(Boolean) as string[];

        return asyncHandleOperation(async () => {
            const workerProfile = await this.findAndAuthorizeWithCleanup(
                id, uploadedPaths, requestUserId, requestUserRole,
            );

            const citizenCardImage = files?.citizenCardImage?.[0];
            const certificateImage = files?.certificateImage?.[0];

            if (workerProfile.status === WorkerStatus.APPROVED && (citizenCardImage || certificateImage)) {
                this.deleteFiles(uploadedPaths);
                throw new ForbiddenException(
                    'Không thể thay đổi ảnh căn cước công dân và chứng chỉ sau khi đã được xác nhận',
                );
            }

            const oldCitizenCardPath = workerProfile.citizenCardImagePath;
            const oldCertificatePath = workerProfile.certificateImagePath;

            if (citizenCardImage) {
                workerProfile.citizenCardImagePath = normalizeUploadPath(citizenCardImage);
            }
            if (certificateImage) {
                workerProfile.certificateImagePath = normalizeUploadPath(certificateImage);
            }

            const updated = await this.workerRepository.save(workerProfile);

            if (citizenCardImage) this.deleteFile(oldCitizenCardPath);
            if (certificateImage) this.deleteFile(oldCertificatePath);

            return this.toResponse(updated);
        }, 'Lỗi khi cập nhật giấy tờ worker');
    }

    async getDocumentPath(
        id: string,
        type: string,
        requestUserId: string,
        requestUserRole: UserRole,
    ): Promise<string> {
        if (!VALID_DOCUMENT_TYPES.includes(type as DocumentType)) {
            throw new BadRequestException(
                `Loại giấy tờ không hợp lệ. Chỉ chấp nhận: ${VALID_DOCUMENT_TYPES.join(', ')}`,
            );
        }

        const workerProfile = await this.findWorkerOrFail(id);
        this.assertCanUpdate(workerProfile, requestUserId, requestUserRole);

        const path =
            type === 'citizen-card'
                ? workerProfile.citizenCardImagePath
                : workerProfile.certificateImagePath;

        if (!path) {
            throw new NotFoundException('Chưa có ảnh giấy tờ này');
        }

        return path;
    }

    // ─── Private helpers ─────────────────────────────────────

    private async findWorkerOrFail(id: string): Promise<WorkerEntity> {
        const worker = await this.workerRepository.findOne({
            where: { id },
            relations: ['user'],
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
            relations: ['user'],
        });

        if (!worker) {
            this.deleteFiles(cleanPaths);
            throw new NotFoundException('Không tìm thấy thông tin worker');
        }

        try {
            this.assertCanUpdate(worker, requestUserId, requestUserRole);
        } catch (e) {
            this.deleteFiles(cleanPaths);
            throw e;
        }

        return worker;
    }

    private assertCanAccess(
        requestUserId: string,
        targetUserId: string,
        requestUserRole: UserRole,
        message: string,
    ) {
        const isOwner = requestUserId === targetUserId;
        const isAdmin = requestUserRole === UserRole.ADMIN;
        if (!isOwner && !isAdmin) {
            throw new ForbiddenException(message);
        }
    }

    private assertCanUpdate(
        workerProfile: WorkerEntity,
        requestUserId: string,
        requestUserRole: UserRole,
    ) {
        this.assertCanAccess(requestUserId, workerProfile.user.id, requestUserRole,
            'Bạn không có quyền cập nhật thông tin này');
    }

    private deleteFile(filePath?: string | null): void {
        if (filePath && existsSync(filePath)) {
            try { unlinkSync(filePath); } catch { /* ignore */ }
        }
    }

    private deleteFiles(paths: string[]): void {
        paths.forEach(p => this.deleteFile(p));
    }

    private toResponse(entity: WorkerEntity): WorkerProfileResponseDto {
        return {
            id: entity.id,
            userId: entity.user.id,
            skills: entity.skills,
            experience: entity.experience,
            bio: entity.bio,
            avatarUrl: entity.avatarPath
                ? `/uploads/${entity.avatarPath.replace(/^uploads\/(public\/)?/, '')}`
                : null,
            hasCitizenCardImage: !!entity.citizenCardImagePath,
            hasCertificateImage: !!entity.certificateImagePath,
            totalJobs: entity.totalJobs,
            avgRating: entity.avgRating,
            status: entity.status,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt,
        };
    }
}
