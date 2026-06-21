import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { DocumentStatus } from 'src/common/enums/document-status.enum';
import { TaskerStatus } from 'src/common/enums/tasker-status.enum';
import { UserRole } from 'src/common/enums/user-role.enum';
import { MailService } from 'src/modules/mail/mail.service';
import { UploadService } from 'src/modules/upload/upload.service';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { DataSource, ILike, Repository } from 'typeorm';
import { AdminBanTaskerDto } from './dto/admin-ban-tasker.dto';
import { AdminReviewTaskerDto } from './dto/admin-review-tasker.dto';
import { QueryTaskersDto } from './dto/query-taskers.dto';
import { ReviewTaskerProfileDto } from './dto/review-tasker-profile.dto';
import { SubmitTaskerProfileDto } from './dto/submit-tasker-profile.dto';
import { TaskerEntity } from './entity/tasker.entity';

export type TaskerProfileResponse = Record<string, unknown>;

@Injectable()
export class TaskerService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(TaskerEntity)
    private readonly taskerRepository: Repository<TaskerEntity>,
    private readonly uploadService: UploadService,
    private readonly mailService: MailService,
  ) {}

  async submitProfile(
    userId: string,
    dto: SubmitTaskerProfileDto,
    files: {
      avatar?: Express.Multer.File[];
      docFront?: Express.Multer.File[];
      docBack?: Express.Multer.File[];
      criminalRecord?: Express.Multer.File[];
      healthCertificate?: Express.Multer.File[];
      certificate?: Express.Multer.File[];
    },
  ): Promise<TaskerProfileResponse> {
    return asyncHandleOperation(async () => {
      const avatar = files.avatar?.[0];
      const docFront = files.docFront?.[0];
      const docBack = files.docBack?.[0];
      if (!avatar) {
        throw new BadRequestException('Vui lòng upload ảnh đại diện');
      }
      if (!docFront || !docBack) {
        throw new BadRequestException(
          'Vui lòng upload đủ ảnh mặt trước và mặt sau căn cước',
        );
      }
      await this.assertProfileCanBeSubmitted(userId);

      const [
        avatarUpload,
        frontUpload,
        backUpload,
        criminalRecordUpload,
        healthCertificateUpload,
        certificateUpload,
      ] = await Promise.all([
        this.uploadService.uploadImage(avatar),
        this.uploadService.uploadImage(docFront),
        this.uploadService.uploadImage(docBack),
        this.uploadOptionalImage(files.criminalRecord?.[0]),
        this.uploadOptionalImage(files.healthCertificate?.[0]),
        this.uploadOptionalImage(files.certificate?.[0]),
      ]);
      const phone = this.normalizePhone(dto.phone);

      const tasker = await this.dataSource.transaction(async (manager) => {
        const userRepository = manager.getRepository(UserEntity);
        const taskerRepository = manager.getRepository(TaskerEntity);

        const user = await userRepository
          .createQueryBuilder('u')
          .setLock('pessimistic_write', undefined, ['u'])
          .where('u.id = :userId', { userId })
          .getOne();
        if (!user) {
          throw new NotFoundException('Không tìm thấy user');
        }

        let tasker = await taskerRepository
          .createQueryBuilder('tasker')
          .leftJoinAndSelect('tasker.user', 'u')
          .setLock('pessimistic_write', undefined, ['tasker'])
          .where('u.id = :userId', { userId })
          .getOne();

        if (tasker?.docStatus === DocumentStatus.APPROVED) {
          throw new ConflictException(
            'Không thể thay đổi hồ sơ sau khi đã được duyệt',
          );
        }

        if (user.role !== UserRole.TASKER) {
          user.role = UserRole.TASKER;
        }
        user.phone = phone;
        user.avatarUrl = avatarUpload.url;
        await userRepository.save(user);

        tasker = taskerRepository.create({
          ...(tasker ?? {}),
          user,
          workingAddress: this.resolveOptionalText(
            dto.workingAddress,
            tasker?.workingAddress,
          ),
          bio: this.resolveOptionalText(dto.bio, tasker?.bio),
          status: TaskerStatus.PENDING,
          docType: dto.docType,
          docIdNumber: dto.docIdNumber,
          docFrontUrl: frontUpload.url,
          docBackUrl: backUpload.url,
          criminalRecordUrl:
            criminalRecordUpload?.url ?? tasker?.criminalRecordUrl ?? null,
          healthCertificateUrl:
            healthCertificateUpload?.url ??
            tasker?.healthCertificateUrl ??
            null,
          certificateUrl:
            certificateUpload?.url ?? tasker?.certificateUrl ?? null,
          docIssuedDate: this.resolveOptionalDate(
            dto.docIssuedDate,
            tasker?.docIssuedDate,
          ),
          docExpiredDate: this.resolveOptionalDate(
            dto.docExpiredDate,
            tasker?.docExpiredDate,
          ),
          docStatus: DocumentStatus.PENDING,
          docReviewedAt: null,
          docNote: null,
          bankName: this.resolveOptionalText(dto.bankName, tasker?.bankName),
          bankAccountNumber: this.resolveOptionalText(
            dto.bankAccountNumber,
            tasker?.bankAccountNumber,
          ),
          bankAccountName: this.resolveOptionalText(
            dto.bankAccountName,
            tasker?.bankAccountName,
          ),
        });

        return taskerRepository.save(tasker);
      });

      return this.mapProfile(tasker);
    }, 'Không thể nộp hồ sơ tasker');
  }

  // ─── Tasker self-service ───────────────────────────────────────────────────

  async findMyProfile(userId: string): Promise<TaskerProfileResponse> {
    return asyncHandleOperation(async () => {
      const tasker = await this.taskerRepository.findOne({
        where: { user: { id: userId } },
        relations: ['user'],
      });

      if (!tasker) {
        throw new NotFoundException('Bạn chưa có hồ sơ tasker');
      }

      return this.mapProfile(tasker);
    }, 'Không thể lấy hồ sơ tasker');
  }

  // ─── Admin: legacy pending-only endpoints ─────────────────────────────────

  async findPendingProfiles(): Promise<{
    total: number;
    items: TaskerProfileResponse[];
  }> {
    return asyncHandleOperation(async () => {
      const taskers = await this.taskerRepository.find({
        where: { docStatus: DocumentStatus.PENDING },
        relations: ['user'],
        order: { updatedAt: 'DESC' },
      });

      return {
        total: taskers.length,
        items: taskers.map((tasker) => this.mapProfile(tasker)),
      };
    }, 'Không thể lấy danh sách hồ sơ chờ duyệt');
  }

  async findPendingProfileDetail(
    taskerId: string,
  ): Promise<TaskerProfileResponse> {
    return asyncHandleOperation(async () => {
      const tasker = await this.taskerRepository.findOne({
        where: {
          id: taskerId,
          docStatus: DocumentStatus.PENDING,
        },
        relations: ['user'],
      });

      if (!tasker) {
        throw new NotFoundException(
          'Không tìm thấy hồ sơ tasker đang chờ duyệt',
        );
      }

      return this.mapProfile(tasker);
    }, 'Không thể lấy chi tiết hồ sơ tasker chờ duyệt');
  }

  async reviewProfile(
    adminUserId: string,
    taskerId: string,
    dto: ReviewTaskerProfileDto,
  ): Promise<TaskerProfileResponse> {
    return asyncHandleOperation(async () => {
      const tasker = await this.dataSource.transaction(async (manager) => {
        const taskerRepository = manager.getRepository(TaskerEntity);
        const userRepository = manager.getRepository(UserEntity);

        const [tasker, admin] = await Promise.all([
          taskerRepository
            .createQueryBuilder('tasker')
            .setLock('pessimistic_write', undefined, ['tasker'])
            .where('tasker.id = :taskerId', { taskerId })
            .getOne(),
          userRepository.findOne({ where: { id: adminUserId } }),
        ]);

        if (!tasker) {
          throw new NotFoundException('Không tìm thấy hồ sơ tasker');
        }

        if (!admin) {
          throw new NotFoundException('Không tìm thấy admin');
        }

        if (tasker.docStatus !== DocumentStatus.PENDING) {
          throw new ConflictException(
            'Chỉ có thể duyệt hồ sơ đang ở trạng thái PENDING',
          );
        }

        if (
          dto.status !== DocumentStatus.APPROVED &&
          dto.status !== DocumentStatus.REJECTED
        ) {
          throw new BadRequestException(
            'Kết quả duyệt hồ sơ chỉ có thể là APPROVED hoặc REJECTED',
          );
        }

        const isApproved = dto.status === DocumentStatus.APPROVED;
        tasker.docStatus = dto.status;
        tasker.status = isApproved
          ? TaskerStatus.ACTIVE
          : TaskerStatus.REJECTED;
        tasker.docReviewedAt = new Date();
        tasker.docNote = isApproved ? null : (dto.reason ?? null);

        const savedTasker = await taskerRepository.save(tasker);

        return taskerRepository.findOneOrFail({
          where: { id: savedTasker.id },
          relations: ['user'],
        });
      });

      return this.mapProfile(tasker);
    }, 'Không thể duyệt hồ sơ tasker');
  }

  // ─── Admin: new management endpoints ──────────────────────────────────────

  async listTaskers(dto: QueryTaskersDto): Promise<{
    data: TaskerProfileResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    return asyncHandleOperation(async () => {
      const { status, docStatus, keyword, page = 1, limit = 10 } = dto;
      const qb = this.taskerRepository
        .createQueryBuilder('tasker')
        .leftJoinAndSelect('tasker.user', 'user')
        .orderBy('tasker.updatedAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      if (status) {
        qb.andWhere('tasker.status = :status', { status });
      }
      if (docStatus) {
        qb.andWhere('tasker.docStatus = :docStatus', { docStatus });
      }
      if (keyword) {
        qb.andWhere('(user.fullName ILIKE :kw OR user.email ILIKE :kw)', {
          kw: `%${keyword}%`,
        });
      }

      const [taskers, total] = await qb.getManyAndCount();
      return {
        data: taskers.map((t) => this.mapProfile(t)),
        total,
        page,
        limit,
      };
    }, 'Không thể lấy danh sách tasker');
  }

  async getTaskerDetail(id: string): Promise<TaskerProfileResponse> {
    return asyncHandleOperation(async () => {
      const tasker = await this.taskerRepository.findOne({
        where: { id },
        relations: ['user'],
      });
      if (!tasker) throw new NotFoundException('Không tìm thấy tasker');
      return this.mapProfile(tasker);
    }, 'Không thể lấy chi tiết tasker');
  }

  async approveTasker(id: string): Promise<TaskerProfileResponse> {
    return asyncHandleOperation(async () => {
      const tasker = await this.taskerRepository.findOne({
        where: { id },
        relations: ['user'],
      });
      if (!tasker) throw new NotFoundException('Không tìm thấy tasker');
      if (tasker.docStatus === DocumentStatus.APPROVED)
        throw new BadRequestException('Tasker đã được duyệt');

      tasker.status = TaskerStatus.ACTIVE;
      tasker.docStatus = DocumentStatus.APPROVED;
      tasker.docReviewedAt = new Date();
      tasker.docNote = null;
      await this.taskerRepository.save(tasker);

      void this.mailService.sendTaskerApprovedEmail(
        tasker.user.email,
        tasker.user.fullName,
      );

      return this.mapProfile(tasker);
    }, 'Không thể duyệt tasker');
  }

  async rejectTasker(
    id: string,
    dto: AdminReviewTaskerDto,
  ): Promise<TaskerProfileResponse> {
    return asyncHandleOperation(async () => {
      const tasker = await this.taskerRepository.findOne({
        where: { id },
        relations: ['user'],
      });
      if (!tasker) throw new NotFoundException('Không tìm thấy tasker');
      if (tasker.docStatus === DocumentStatus.REJECTED)
        throw new BadRequestException('Tasker đã bị từ chối');

      tasker.status = TaskerStatus.REJECTED;
      tasker.docStatus = DocumentStatus.REJECTED;
      tasker.docNote = dto.notes;
      tasker.docReviewedAt = new Date();
      await this.taskerRepository.save(tasker);

      void this.mailService.sendTaskerRejectedEmail(
        tasker.user.email,
        tasker.user.fullName,
      );

      return this.mapProfile(tasker);
    }, 'Không thể từ chối tasker');
  }

  async requestMoreInfo(
    id: string,
    dto: AdminReviewTaskerDto,
  ): Promise<TaskerProfileResponse> {
    return asyncHandleOperation(async () => {
      const tasker = await this.taskerRepository.findOne({
        where: { id },
        relations: ['user'],
      });
      if (!tasker) throw new NotFoundException('Không tìm thấy tasker');

      const allowedStatuses: DocumentStatus[] = [
        DocumentStatus.PENDING,
        DocumentStatus.NEED_INFO,
      ];
      if (!allowedStatuses.includes(tasker.docStatus)) {
        throw new BadRequestException(
          'Chỉ có thể yêu cầu bổ sung khi hồ sơ đang PENDING hoặc NEED_INFO',
        );
      }

      tasker.docStatus = DocumentStatus.NEED_INFO;
      tasker.docNote = dto.notes;
      tasker.docReviewedAt = new Date();
      await this.taskerRepository.save(tasker);

      void this.mailService.sendTaskerRequestInfoEmail(
        tasker.user.email,
        tasker.user.fullName,
        dto.notes,
      );

      return this.mapProfile(tasker);
    }, 'Không thể yêu cầu bổ sung thông tin');
  }

  async banTasker(
    id: string,
    dto: AdminBanTaskerDto,
  ): Promise<TaskerProfileResponse> {
    return asyncHandleOperation(async () => {
      const tasker = await this.taskerRepository.findOne({
        where: { id },
        relations: ['user'],
      });
      if (!tasker) throw new NotFoundException('Không tìm thấy tasker');

      const bannedStatuses: TaskerStatus[] = [
        TaskerStatus.SUSPENDED,
        TaskerStatus.TERMINATED,
      ];
      if (bannedStatuses.includes(tasker.status)) {
        throw new BadRequestException(
          'Tasker đã bị khóa hoặc chấm dứt hợp đồng',
        );
      }

      tasker.status = TaskerStatus.SUSPENDED;
      tasker.banReason = `[${dto.type}] ${dto.reason}`;
      await this.taskerRepository.save(tasker);

      void this.mailService.sendTaskerBannedEmail(
        tasker.user.email,
        tasker.user.fullName,
        dto.reason,
      );

      return this.mapProfile(tasker);
    }, 'Không thể khóa tasker');
  }

  async unbanTasker(id: string): Promise<TaskerProfileResponse> {
    return asyncHandleOperation(async () => {
      const tasker = await this.taskerRepository.findOne({
        where: { id },
        relations: ['user'],
      });
      if (!tasker) throw new NotFoundException('Không tìm thấy tasker');
      if (tasker.status !== TaskerStatus.SUSPENDED)
        throw new BadRequestException('Tasker không đang bị khóa');

      tasker.status = TaskerStatus.ACTIVE;
      tasker.banReason = null;
      await this.taskerRepository.save(tasker);

      return this.mapProfile(tasker);
    }, 'Không thể mở khóa tasker');
  }

  async getPenalties(id: string): Promise<{ data: unknown[] }> {
    return asyncHandleOperation(async () => {
      const tasker = await this.taskerRepository.findOne({ where: { id } });
      if (!tasker) throw new NotFoundException('Không tìm thấy tasker');
      return { data: [] };
    }, 'Không thể lấy danh sách vi phạm');
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async assertProfileCanBeSubmitted(userId: string): Promise<void> {
    const [user, tasker] = await Promise.all([
      this.dataSource.getRepository(UserEntity).findOne({
        where: { id: userId },
      }),
      this.taskerRepository.findOne({
        where: { user: { id: userId } },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }

    if (tasker?.docStatus === DocumentStatus.APPROVED) {
      throw new ConflictException(
        'Không thể thay đổi hồ sơ sau khi đã được duyệt',
      );
    }
  }

  private async uploadOptionalImage(
    file?: Express.Multer.File,
  ): Promise<{ url: string; public_id: string } | null> {
    if (!file) {
      return null;
    }

    return this.uploadService.uploadImage(file);
  }

  private resolveOptionalText(
    value: string | undefined,
    currentValue?: string | null,
  ): string | null {
    if (value === undefined) {
      return currentValue ?? null;
    }

    return value.trim() || null;
  }

  private resolveOptionalDate(
    value: string | undefined,
    currentValue?: Date | null,
  ): Date | null {
    if (value === undefined) {
      return currentValue ?? null;
    }

    return value ? new Date(value) : null;
  }

  private normalizePhone(value: string): string {
    const phone = value.trim();
    if (!/^0\d{9,10}$/.test(phone)) {
      throw new BadRequestException(
        'phone phải bắt đầu bằng 0 và có 10-11 chữ số',
      );
    }

    return phone;
  }

  private mapProfile(tasker: TaskerEntity): TaskerProfileResponse {
    const fullName = tasker.user?.fullName ?? null;
    const phone = tasker.user?.phone ?? null;
    const avatarUrl = tasker.user?.avatarUrl ?? null;

    return {
      id: tasker.id,
      userId: tasker.user?.id ?? null,
      status: tasker.status,
      presenceStatus: tasker.presenceStatus,
      approvalStatus: tasker.docStatus.toLowerCase(),
      workingAddress: tasker.workingAddress ?? null,
      bio: tasker.bio ?? null,
      fullName,
      phone,
      avatarUrl,
      bankName: tasker.bankName ?? null,
      bankAccountNumber: tasker.bankAccountNumber ?? null,
      bankAccountName: tasker.bankAccountName ?? null,
      adminNotes: tasker.docNote ?? null,
      banReason: tasker.banReason ?? null,
      totalJobs: tasker.totalCompletedJobs,
      avgRating: Number(tasker.ratingAvg),
      hasCitizenCardImage: Boolean(tasker.docFrontUrl && tasker.docBackUrl),
      hasCriminalRecordImage: Boolean(tasker.criminalRecordUrl),
      hasHealthCertificateImage: Boolean(tasker.healthCertificateUrl),
      hasCertificateImage: Boolean(tasker.certificateUrl),
      hasIdWithSelfieImage: Boolean(avatarUrl),
      bank: {
        name: tasker.bankName ?? null,
        accountNumber: tasker.bankAccountNumber ?? null,
        accountName: tasker.bankAccountName ?? null,
      },
      user: {
        id: tasker.user?.id ?? null,
        email: tasker.user?.email ?? null,
        fullName,
        phone,
        avatarUrl,
        isActive: tasker.user?.isActive ?? null,
      },
      document: {
        type: tasker.docType ?? null,
        idNumber: tasker.docIdNumber ?? null,
        frontUrl: tasker.docFrontUrl ?? null,
        backUrl: tasker.docBackUrl ?? null,
        criminalRecordUrl: tasker.criminalRecordUrl ?? null,
        healthCertificateUrl: tasker.healthCertificateUrl ?? null,
        certificateUrl: tasker.certificateUrl ?? null,
        issuedDate: tasker.docIssuedDate ?? null,
        expiredDate: tasker.docExpiredDate ?? null,
        status: tasker.docStatus,
        reviewedAt: tasker.docReviewedAt ?? null,
        note: tasker.docNote ?? null,
      },
      stats: {
        depositAmount: Number(tasker.depositAmount),
        currentDepositBalance: Number(tasker.currentDepositBalance),
        ratingAvg: Number(tasker.ratingAvg),
        totalCompletedJobs: tasker.totalCompletedJobs,
        totalWorkingHours: Number(tasker.totalWorkingHours),
        totalPoints: tasker.totalPoints,
      },
      createdAt: tasker.createdAt,
      updatedAt: tasker.updatedAt,
    };
  }
}
