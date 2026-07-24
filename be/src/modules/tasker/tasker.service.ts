import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { DocumentStatus } from 'src/common/enums/document-status.enum';
import { TaskerEquipmentStatus } from 'src/common/enums/tasker-equipment-status.enum';
import {
  ReviewTaskerEquipmentDto,
  SubmitTaskerEquipmentDto,
  TaskerEquipmentReviewAction,
} from './dto/tasker-equipment.dto';
import { TaskerStatus } from 'src/common/enums/tasker-status.enum';
import { UserRole } from 'src/common/enums/user-role.enum';
import { BanType } from 'src/common/enums/ban-type.enum';
import { TASKER_PRESENCE_STATUS } from 'src/common/enums/tasker-presence-status.enum';
import { WalletOwnerType } from 'src/common/enums/wallet-owner-type.enum';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { MailService } from 'src/modules/mail/mail.service';
import { AppealTokenService } from 'src/modules/appeal/appeal-token.service';
import { UploadService } from 'src/modules/upload/upload.service';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { WalletTransactionEntity } from 'src/modules/wallet/entity/wallet-transaction.entity';
import { DataSource, EntityManager, In, Not, Repository } from 'typeorm';
import { AdminBanTaskerDto } from './dto/admin-ban-tasker.dto';
import { AdminReviewTaskerDto } from './dto/admin-review-tasker.dto';
import { AdminUpdateTaskerDto } from './dto/admin-update-tasker.dto';
import { AdminUpdateTaskerWorkStatusDto } from './dto/admin-update-tasker-work-status.dto';
import { QueryTaskersDto } from './dto/query-taskers.dto';
import { SubmitTaskerProfileDto } from './dto/submit-tasker-profile.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { TaskerEntity } from './entity/tasker.entity';
import { TaskerPenaltyEntity } from './entity/tasker-penalty.entity';
import {
  AutoUnbanJobData,
  TASKER_JOB_AUTO_UNBAN,
  TASKER_JOB_OPTS,
  TASKER_QUEUE,
} from './tasker.constants';

export type TaskerProfileResponse = Record<string, unknown>;

interface RedisLike {
  hset(key: string, values: Record<string, string>): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  del(...keys: string[]): Promise<number>;
}

const TASKER_LOCATION_TTL_SECONDS = 5 * 60;

type TaskerDocumentUploadField =
  | 'avatar'
  | 'docFront'
  | 'docBack'
  | 'criminalRecord'
  | 'healthCertificate'
  | 'certificate';

type TaskerDocumentUploadFiles = Partial<
  Record<TaskerDocumentUploadField, Express.Multer.File[]>
>;

interface StructuredReviewNotes {
  v: 2;
  items: string[];
  itemLabels?: string[];
  itemNotes?: Record<string, string>;
  note?: string;
}

const DOCUMENT_REVIEW_ITEM_BY_FIELD: Record<TaskerDocumentUploadField, string> =
  {
    avatar: 'idWithSelfie',
    docFront: 'citizenCard',
    docBack: 'citizenCard',
    criminalRecord: 'criminalRecord',
    healthCertificate: 'healthCertificate',
    certificate: 'certificate',
  };

const DOCUMENT_LABEL_BY_FIELD: Record<TaskerDocumentUploadField, string> = {
  avatar: 'Ảnh selfie xác minh',
  docFront: 'Mặt trước CCCD',
  docBack: 'Mặt sau CCCD',
  criminalRecord: 'Lý lịch tư pháp',
  healthCertificate: 'Giấy khám sức khỏe',
  certificate: 'Chứng chỉ nghề nghiệp',
};

@Injectable()
export class TaskerService {
  private readonly logger = new Logger(TaskerService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(TaskerEntity)
    private readonly taskerRepository: Repository<TaskerEntity>,
    @InjectRepository(TaskerPenaltyEntity)
    private readonly penaltyRepository: Repository<TaskerPenaltyEntity>,
    @InjectQueue(TASKER_QUEUE)
    private readonly taskerQueue: Queue,
    private readonly uploadService: UploadService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly appealTokenService: AppealTokenService,
  ) {}

  /** Gửi email "best-effort": lỗi gửi chỉ log, không làm hỏng nghiệp vụ chính. */
  private safeSendEmail(promise: Promise<unknown>, context: string): void {
    void promise.catch((err) =>
      this.logger.error(`Gửi email thất bại (${context})`, err as Error),
    );
  }

  private async redis(): Promise<RedisLike> {
    return this.taskerQueue.client as Promise<RedisLike>;
  }

  private async cacheTaskerLocation(
    taskerId: string,
    lat: number,
    lng: number,
  ): Promise<void> {
    const redis = await this.redis();
    const key = `tasker:loc:${taskerId}`;
    await redis.hset(key, {
      lat: String(lat),
      lng: String(lng),
      at: new Date().toISOString(),
    });
    await redis.expire(key, TASKER_LOCATION_TTL_SECONDS);
  }

  private async clearTaskerLocation(taskerId: string): Promise<void> {
    const redis = await this.redis();
    await redis.del(`tasker:loc:${taskerId}`);
  }

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
      await this.assertProfileCanBeSubmitted(userId);

      // Hồ sơ hiện có (nếu nộp lại sau khi bị yêu cầu bổ sung / từ chối).
      // Cho phép giữ lại ảnh từ lần nộp trước, chỉ tải lại phần cần sửa.
      const existing = await this.taskerRepository.findOne({
        where: { user: { id: userId } },
        relations: ['user'],
      });

      const avatar = files.avatar?.[0];
      const docFront = files.docFront?.[0];
      const docBack = files.docBack?.[0];

      if (!avatar && !existing?.user?.avatarUrl) {
        throw new BadRequestException('Vui lòng upload ảnh đại diện');
      }
      if (
        (!docFront && !existing?.docFrontUrl) ||
        (!docBack && !existing?.docBackUrl)
      ) {
        throw new BadRequestException(
          'Vui lòng upload đủ ảnh mặt trước và mặt sau căn cước',
        );
      }

      const [
        avatarUpload,
        frontUpload,
        backUpload,
        criminalRecordUpload,
        healthCertificateUpload,
        certificateUpload,
      ] = await Promise.all([
        this.uploadOptionalImage(avatar),
        this.uploadOptionalImage(docFront),
        this.uploadOptionalImage(docBack),
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

        // 1 số CCCD/CMND chỉ thuộc về 1 tasker — chặn dùng chung (loại trừ chính
        // user này để cho phép nộp lại). DB cũng có unique index lo trường hợp race.
        if (dto.docIdNumber) {
          const dup = await taskerRepository.findOne({
            where: { docIdNumber: dto.docIdNumber, user: { id: Not(userId) } },
            relations: ['user'],
          });
          if (dup) {
            throw new ConflictException(
              'Số CCCD/CMND này đã được dùng cho một tasker khác.',
            );
          }
        }

        // Role chỉ được nâng CUSTOMER → TASKER khi admin duyệt (approveTasker),
        // không nâng ở bước nộp hồ sơ. Applicant đang chờ vẫn là CUSTOMER.
        user.phone = phone;
        if (avatarUpload?.url) {
          user.avatarUrl = avatarUpload.url;
        }
        await userRepository.save(user);

        tasker = taskerRepository.create({
          ...(tasker ?? {}),
          user,
          workingAddress: this.resolveOptionalText(
            dto.workingAddress,
            tasker?.workingAddress,
          ),
          bio: this.resolveOptionalText(dto.bio, tasker?.bio),
          experience: this.resolveOptionalText(
            dto.experience,
            tasker?.experience,
          ),
          skills: this.resolveOptionalText(dto.skills, tasker?.skills),
          status: TaskerStatus.PENDING,
          docType: dto.docType,
          docIdNumber: dto.docIdNumber,
          docFrontUrl: frontUpload?.url ?? tasker?.docFrontUrl ?? null,
          docBackUrl: backUpload?.url ?? tasker?.docBackUrl ?? null,
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

  async findMyProfile(userId: string): Promise<TaskerProfileResponse | null> {
    return asyncHandleOperation(async () => {
      const tasker = await this.taskerRepository.findOne({
        where: { user: { id: userId } },
        relations: ['user'],
      });

      if (!tasker) {
        return null;
      }

      return this.mapProfile(tasker);
    }, 'Không thể lấy hồ sơ tasker');
  }

  /**
   * Tasker nộp ảnh bộ dụng cụ chuyên dụng để xin vào nhóm nhận đơn Cao cấp.
   * Nộp lại khi đã APPROVED sẽ đưa về PENDING — quyền lợi Cao cấp phải được
   * duyệt lại trên bộ ảnh mới, không mặc nhiên giữ nguyên.
   */
  async submitMyEquipment(
    userId: string,
    dto: SubmitTaskerEquipmentDto,
  ): Promise<TaskerProfileResponse> {
    return asyncHandleOperation(async () => {
      const tasker = await this.taskerRepository.findOne({
        where: { user: { id: userId } },
        relations: ['user'],
      });
      if (!tasker) throw new NotFoundException('Không tìm thấy hồ sơ tasker');

      tasker.equipmentPhotoUrls = dto.photoUrls;
      tasker.equipmentNote = dto.note ?? null;
      tasker.equipmentStatus = TaskerEquipmentStatus.PENDING;
      tasker.equipmentReviewedAt = null;
      tasker.equipmentReviewedBy = null;
      await this.taskerRepository.save(tasker);

      return this.mapProfile(tasker);
    }, 'Không thể nộp hồ sơ dụng cụ');
  }

  /** Admin duyệt/từ chối bộ dụng cụ — quyết định tasker có vào pool PREMIUM. */
  async reviewTaskerEquipment(
    id: string,
    dto: ReviewTaskerEquipmentDto,
    adminId?: string,
  ): Promise<TaskerProfileResponse> {
    return asyncHandleOperation(async () => {
      const tasker = await this.taskerRepository.findOne({
        where: { id },
        relations: ['user'],
      });
      if (!tasker) throw new NotFoundException('Không tìm thấy tasker');

      if (tasker.equipmentStatus !== TaskerEquipmentStatus.PENDING) {
        throw new BadRequestException(
          'Chỉ duyệt được hồ sơ dụng cụ đang chờ (PENDING)',
        );
      }

      const isApprove = dto.action === TaskerEquipmentReviewAction.APPROVE;
      if (!isApprove && !dto.note?.trim()) {
        throw new BadRequestException('Vui lòng nhập lý do từ chối');
      }

      tasker.equipmentStatus = isApprove
        ? TaskerEquipmentStatus.APPROVED
        : TaskerEquipmentStatus.REJECTED;
      tasker.equipmentNote = dto.note?.trim() || null;
      tasker.equipmentReviewedAt = new Date();
      tasker.equipmentReviewedBy = adminId ?? null;
      tasker.updatedBy = adminId ?? null;
      await this.taskerRepository.save(tasker);

      const adminNames = await this.resolveAdminNames([
        tasker.equipmentReviewedBy,
        tasker.updatedBy,
      ]);
      return this.mapProfile(tasker, adminNames);
    }, 'Không thể duyệt hồ sơ dụng cụ');
  }

  /**
   * Tasker/applicant tự cập nhật thông tin hồ sơ (không gồm giấy tờ).
   * Nếu admin đang yêu cầu bổ sung đúng mục vừa sửa (NEED_INFO) thì gỡ mục đó
   * khỏi ghi chú review; hết mục thì hồ sơ quay về PENDING chờ duyệt lại.
   */
  async updateMyProfile(
    userId: string,
    dto: UpdateMyProfileDto,
  ): Promise<TaskerProfileResponse> {
    return asyncHandleOperation(async () => {
      const savedTasker = await this.dataSource.transaction(async (manager) => {
        const taskerRepository = manager.getRepository(TaskerEntity);
        const userRepository = manager.getRepository(UserEntity);
        const tasker = await taskerRepository
          .createQueryBuilder('tasker')
          .leftJoinAndSelect('tasker.user', 'user')
          .setLock('pessimistic_write', undefined, ['tasker'])
          .where('user.id = :userId', { userId })
          .getOne();

        if (!tasker?.user) {
          throw new NotFoundException('Không tìm thấy hồ sơ tasker');
        }

        // id các mục trong ghi chú review được coi là "đã sửa" khi field gửi lên.
        const resolvedItems = new Set<string>();

        if (dto.phone !== undefined) {
          tasker.user.phone = this.normalizePhone(dto.phone);
          resolvedItems.add('phone');
        }
        if (dto.bio !== undefined) {
          tasker.bio = dto.bio;
          resolvedItems.add('bio');
        }
        if (dto.experience !== undefined) {
          tasker.experience = dto.experience;
          resolvedItems.add('experience');
        }
        if (dto.skills !== undefined) {
          tasker.skills = dto.skills;
          resolvedItems.add('skills');
        }
        if (dto.addressCurrent !== undefined) {
          tasker.workingAddress = dto.addressCurrent;
          resolvedItems.add('address');
        }
        if (
          dto.bankName !== undefined ||
          dto.bankAccountNumber !== undefined ||
          dto.bankAccountName !== undefined
        ) {
          if (dto.bankName !== undefined) tasker.bankName = dto.bankName;
          if (dto.bankAccountNumber !== undefined) {
            tasker.bankAccountNumber = dto.bankAccountNumber;
          }
          if (dto.bankAccountName !== undefined) {
            tasker.bankAccountName = dto.bankAccountName;
          }
          resolvedItems.add('bankInfo');
        }

        if (resolvedItems.size === 0) {
          throw new BadRequestException('Không có thông tin nào để cập nhật');
        }

        await userRepository.save(tasker.user);

        if (tasker.docStatus === DocumentStatus.NEED_INFO) {
          const reviewNotes = this.parseStructuredReviewNotes(tasker.docNote);
          const hasRequestedItem = reviewNotes?.items.some((id) =>
            resolvedItems.has(id),
          );
          if (reviewNotes && hasRequestedItem) {
            const remainingNotes = this.removeResolvedReviewItems(
              reviewNotes,
              resolvedItems,
            );
            tasker.docStatus = remainingNotes
              ? DocumentStatus.NEED_INFO
              : DocumentStatus.PENDING;
            tasker.docNote = remainingNotes;
            tasker.docReviewedAt = null;
            tasker.docReviewedBy = null;
          }
        }

        return taskerRepository.save(tasker);
      });

      return this.mapProfile(savedTasker);
    }, 'Không thể cập nhật hồ sơ tasker');
  }

  async updateMyDocuments(
    userId: string,
    files: TaskerDocumentUploadFiles,
  ): Promise<TaskerProfileResponse> {
    return asyncHandleOperation(async () => {
      const fields: TaskerDocumentUploadField[] = [
        'avatar',
        'docFront',
        'docBack',
        'criminalRecord',
        'healthCertificate',
        'certificate',
      ];
      const provided = fields.flatMap((field) => {
        const file = files[field]?.[0];
        return file ? [{ field, file }] : [];
      });

      if (provided.length === 0) {
        throw new BadRequestException('Vui lòng chọn ít nhất một giấy tờ');
      }

      const settledUploads = await Promise.allSettled(
        provided.map(async ({ field, file }) => ({
          field,
          upload: await this.uploadService.uploadImage(file),
        })),
      );
      const successfulUploads = settledUploads.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value] : [],
      );
      const failedUpload = settledUploads.find(
        (result) => result.status === 'rejected',
      );

      if (failedUpload?.status === 'rejected') {
        await this.cleanupUploadedPublicIds(
          successfulUploads.map(({ upload }) => upload.public_id),
        );
        throw failedUpload.reason;
      }

      const replacedUrls: string[] = [];
      let savedTasker: TaskerEntity;

      try {
        savedTasker = await this.dataSource.transaction(async (manager) => {
          const taskerRepository = manager.getRepository(TaskerEntity);
          const userRepository = manager.getRepository(UserEntity);
          const tasker = await taskerRepository
            .createQueryBuilder('tasker')
            .leftJoinAndSelect('tasker.user', 'user')
            .setLock('pessimistic_write', undefined, ['tasker'])
            .where('user.id = :userId', { userId })
            .getOne();

          if (!tasker?.user) {
            throw new NotFoundException('Không tìm thấy hồ sơ tasker');
          }

          const reviewNotes = this.parseStructuredReviewNotes(tasker.docNote);
          const requestedItems = new Set(reviewNotes?.items ?? []);
          const providedFields = new Set(
            successfulUploads.map(({ field }) => field),
          );

          if (
            requestedItems.has('citizenCard') &&
            (providedFields.has('docFront') || providedFields.has('docBack')) &&
            (!providedFields.has('docFront') || !providedFields.has('docBack'))
          ) {
            throw new BadRequestException(
              'Admin yêu cầu cập nhật CCCD, vui lòng tải đủ mặt trước và mặt sau',
            );
          }

          for (const { field, upload } of successfulUploads) {
            const currentUrl = this.getDocumentUrl(tasker, field);
            const reviewItem = DOCUMENT_REVIEW_ITEM_BY_FIELD[field];
            const adminRequestedReplacement =
              tasker.docStatus === DocumentStatus.NEED_INFO &&
              requestedItems.has(reviewItem);

            if (currentUrl && !adminRequestedReplacement) {
              throw new ConflictException(
                `${DOCUMENT_LABEL_BY_FIELD[field]} đã được tải lên và đang bị khóa`,
              );
            }

            if (currentUrl) {
              replacedUrls.push(currentUrl);
            }
            this.setDocumentUrl(tasker, field, upload.url);
          }

          if (providedFields.has('avatar')) {
            await userRepository.save(tasker.user);
          }

          const resolvedItems = new Set(
            successfulUploads.map(
              ({ field }) => DOCUMENT_REVIEW_ITEM_BY_FIELD[field],
            ),
          );
          const remainingNotes = this.removeResolvedReviewItems(
            reviewNotes,
            resolvedItems,
          );

          tasker.docStatus = remainingNotes
            ? DocumentStatus.NEED_INFO
            : DocumentStatus.PENDING;
          tasker.docNote = remainingNotes;
          tasker.docReviewedAt = null;
          tasker.docReviewedBy = null;

          return taskerRepository.save(tasker);
        });
      } catch (error) {
        await this.cleanupUploadedPublicIds(
          successfulUploads.map(({ upload }) => upload.public_id),
        );
        throw error;
      }

      await this.cleanupTaskerAssets(replacedUrls);
      return this.mapProfile(savedTasker);
    }, 'Không thể cập nhật giấy tờ tasker');
  }

  async updatePresence(
    userId: string,
    presenceStatus: TASKER_PRESENCE_STATUS,
    lat?: number,
    lng?: number,
  ): Promise<TaskerProfileResponse> {
    return asyncHandleOperation(async () => {
      const tasker = await this.taskerRepository.findOne({
        where: { user: { id: userId } },
        relations: ['user'],
      });

      if (!tasker) {
        throw new NotFoundException('Không tìm thấy hồ sơ tasker');
      }

      // Tasker bị khóa/chấm dứt không được bật trạng thái hoạt động (nhận việc).
      if (
        tasker.status === TaskerStatus.SUSPENDED ||
        tasker.status === TaskerStatus.TERMINATED
      ) {
        throw new BadRequestException(
          'Tài khoản đang bị khóa, không thể thay đổi trạng thái hoạt động.',
        );
      }

      tasker.presenceStatus = presenceStatus;
      const saved = await this.taskerRepository.save(tasker);

      // Cập nhật vị trí khi chuyển sang ONLINE có kèm tọa độ
      if (
        presenceStatus === TASKER_PRESENCE_STATUS.ONLINE &&
        lat != null &&
        lng != null
      ) {
        await this.updateTaskerLocationColumns(tasker.id, lat, lng);
        await this.cacheTaskerLocation(tasker.id, lat, lng);
      }

      if (presenceStatus === TASKER_PRESENCE_STATUS.OFFLINE) {
        await this.clearTaskerLocation(tasker.id);
      }

      return this.mapProfile(saved);
    }, 'Không thể cập nhật trạng thái hoạt động');
  }

  async updateLocation(
    userId: string,
    lat: number,
    lng: number,
  ): Promise<void> {
    return asyncHandleOperation(async () => {
      const tasker = await this.taskerRepository.findOne({
        where: { user: { id: userId } },
        select: ['id', 'presenceStatus'],
      });

      if (!tasker) {
        throw new NotFoundException('Không tìm thấy hồ sơ tasker');
      }

      if (tasker.presenceStatus !== TASKER_PRESENCE_STATUS.ONLINE) {
        throw new BadRequestException(
          'Chỉ được cập nhật vị trí khi đang ở trạng thái ONLINE',
        );
      }

      await this.updateTaskerLocationColumns(tasker.id, lat, lng);
      await this.cacheTaskerLocation(tasker.id, lat, lng);
    }, 'Không thể cập nhật vị trí');
  }

  private async updateTaskerLocationColumns(
    taskerId: string,
    lat: number,
    lng: number,
  ): Promise<void> {
    await this.dataSource.query(
      `UPDATE taskers
           SET current_location    = ST_SetSRID(ST_Point($1, $2), 4326)::geography,
               location_updated_at = NOW()
         WHERE id = $3`,
      [lng, lat, taskerId],
    );
  }

  // ─── Admin: tasker management ─────────────────────────────────────────────

  async listTaskers(dto: QueryTaskersDto): Promise<{
    data: TaskerProfileResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    return asyncHandleOperation(async () => {
      const {
        status,
        docStatus,
        equipmentStatus,
        keyword,
        page = 1,
        limit = 10,
      } = dto;
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
      if (equipmentStatus) {
        qb.andWhere('tasker.equipmentStatus = :equipmentStatus', {
          equipmentStatus,
        });
      }
      if (keyword) {
        qb.andWhere(
          '(user.fullName ILIKE :kw OR user.email ILIKE :kw OR user.phone ILIKE :kw)',
          { kw: `%${keyword}%` },
        );
      }

      const [taskers, total] = await qb.getManyAndCount();
      const adminNames = await this.resolveAdminNames(
        taskers.flatMap((t) => [
          t.docReviewedBy,
          t.equipmentReviewedBy,
          t.updatedBy,
        ]),
      );
      return {
        data: taskers.map((t) => this.mapProfile(t, adminNames)),
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
      const adminNames = await this.resolveAdminNames([
        tasker.docReviewedBy,
        tasker.equipmentReviewedBy,
        tasker.updatedBy,
      ]);
      return this.mapProfile(tasker, adminNames);
    }, 'Không thể lấy chi tiết tasker');
  }

  /**
   * Thu nhập tasker & chiết khấu nền tảng theo kỳ.
   * Mỗi lượt chuyển tiền ghi 2 dòng sổ ví (nợ + có) cùng loại — lọc theo
   * owner_type của ví để không đếm trùng: TASKER_EARNING chỉ tính ở ví TASKER
   * của chính tasker này, PLATFORM_FEE chỉ tính ở ví SYSTEM nhưng lọc qua
   * booking.tasker_id để biết khoản chiết khấu đó lấy từ tasker nào.
   */
  async getTaskerEarningsSummary(
    id: string,
    fromDate: string,
    toDate: string,
  ): Promise<{
    taskerEarnings: number;
    platformCommission: number;
    completedBookings: number;
  }> {
    return asyncHandleOperation(async () => {
      const tasker = await this.taskerRepository.findOne({ where: { id } });
      if (!tasker) throw new NotFoundException('Không tìm thấy tasker');

      const toDateEnd = `${toDate} 23:59:59.999`;
      const walletTxRepo = this.dataSource.getRepository(
        WalletTransactionEntity,
      );

      const earningsRow = await walletTxRepo
        .createQueryBuilder('wt')
        .innerJoin('wt.wallet', 'w')
        .select('COALESCE(SUM(wt.amount), 0)', 'total')
        .addSelect('COUNT(DISTINCT wt.booking_id)', 'bookings')
        .where('w.owner_type = :ownerType', {
          ownerType: WalletOwnerType.TASKER,
        })
        .andWhere('w.tasker_id = :taskerId', { taskerId: id })
        .andWhere('wt.type = :type', {
          type: WalletTransactionType.TASKER_EARNING,
        })
        .andWhere('wt.created_at BETWEEN :from AND :to', {
          from: fromDate,
          to: toDateEnd,
        })
        .getRawOne<{ total: string; bookings: string }>();

      const commissionRow = await walletTxRepo
        .createQueryBuilder('wt')
        .innerJoin('wt.wallet', 'w')
        .innerJoin('wt.booking', 'b')
        .select('COALESCE(SUM(wt.amount), 0)', 'total')
        .where('w.owner_type = :ownerType', {
          ownerType: WalletOwnerType.SYSTEM,
        })
        .andWhere('b.tasker_id = :taskerId', { taskerId: id })
        .andWhere('wt.type = :type', {
          type: WalletTransactionType.PLATFORM_FEE,
        })
        .andWhere('wt.created_at BETWEEN :from AND :to', {
          from: fromDate,
          to: toDateEnd,
        })
        .getRawOne<{ total: string }>();

      return {
        taskerEarnings: Number(earningsRow?.total ?? 0),
        platformCommission: Number(commissionRow?.total ?? 0),
        completedBookings: Number(earningsRow?.bookings ?? 0),
      };
    }, 'Không thể lấy dữ liệu thu nhập tasker');
  }

  /**
   * Danh sách "phiếu lương" theo từng đơn trong kỳ — mỗi dòng ghép khoản
   * tasker nhận (ví TASKER) với khoản chiết khấu nền tảng (ví SYSTEM) cùng
   * booking_id, vì 2 khoản này nằm ở 2 ví khác nhau nên phải truy 2 lượt rồi
   * ghép ở tầng ứng dụng thay vì JOIN trực tiếp (JOIN sẽ nhân đôi dòng).
   */
  async getTaskerEarningsDetails(
    id: string,
    fromDate: string,
    toDate: string,
  ): Promise<
    Array<{
      bookingId: string;
      bookingCode: string;
      completedAt: Date | null;
      taskerEarning: number;
      platformCommission: number;
      createdAt: Date;
    }>
  > {
    return asyncHandleOperation(async () => {
      const tasker = await this.taskerRepository.findOne({ where: { id } });
      if (!tasker) throw new NotFoundException('Không tìm thấy tasker');

      const toDateEnd = `${toDate} 23:59:59.999`;
      const walletTxRepo = this.dataSource.getRepository(
        WalletTransactionEntity,
      );

      const earnings = await walletTxRepo
        .createQueryBuilder('wt')
        .innerJoin('wt.wallet', 'w')
        .innerJoin('wt.booking', 'b')
        .select('b.id', 'bookingId')
        .addSelect('b.bookingCode', 'bookingCode')
        .addSelect('b.completedAt', 'completedAt')
        .addSelect('wt.amount', 'taskerEarning')
        .addSelect('wt.createdAt', 'createdAt')
        .where('w.owner_type = :ownerType', {
          ownerType: WalletOwnerType.TASKER,
        })
        .andWhere('w.tasker_id = :taskerId', { taskerId: id })
        .andWhere('wt.type = :type', {
          type: WalletTransactionType.TASKER_EARNING,
        })
        .andWhere('wt.created_at BETWEEN :from AND :to', {
          from: fromDate,
          to: toDateEnd,
        })
        .orderBy('wt.created_at', 'DESC')
        .getRawMany<{
          bookingId: string;
          bookingCode: string;
          completedAt: Date | null;
          taskerEarning: string;
          createdAt: Date;
        }>();

      if (earnings.length === 0) return [];

      const bookingIds = earnings.map((e) => e.bookingId);
      const fees = await walletTxRepo
        .createQueryBuilder('wt')
        .innerJoin('wt.wallet', 'w')
        .innerJoin('wt.booking', 'b')
        .select('b.id', 'bookingId')
        .addSelect('wt.amount', 'platformCommission')
        .where('w.owner_type = :ownerType', {
          ownerType: WalletOwnerType.SYSTEM,
        })
        .andWhere('wt.type = :type', {
          type: WalletTransactionType.PLATFORM_FEE,
        })
        .andWhere('b.id IN (:...bookingIds)', { bookingIds })
        .getRawMany<{ bookingId: string; platformCommission: string }>();

      const feeByBooking = new Map(
        fees.map((f) => [f.bookingId, Number(f.platformCommission)]),
      );

      return earnings.map((e) => ({
        bookingId: e.bookingId,
        bookingCode: e.bookingCode,
        completedAt: e.completedAt,
        taskerEarning: Number(e.taskerEarning),
        platformCommission: feeByBooking.get(e.bookingId) ?? 0,
        createdAt: e.createdAt,
      }));
    }, 'Không thể lấy danh sách phiếu lương tasker');
  }

  /** Admin sửa thông tin cơ bản của tasker (không đụng giấy tờ KYC). */
  async updateTaskerByAdmin(
    id: string,
    dto: AdminUpdateTaskerDto,
    adminId?: string,
  ): Promise<TaskerProfileResponse> {
    return asyncHandleOperation(async () => {
      const tasker = await this.dataSource.transaction(async (manager) => {
        const taskerRepo = manager.getRepository(TaskerEntity);
        const userRepo = manager.getRepository(UserEntity);
        const t = await taskerRepo.findOne({
          where: { id },
          relations: ['user'],
        });
        if (!t || !t.user) throw new NotFoundException('Không tìm thấy tasker');

        if (dto.fullName !== undefined) t.user.fullName = dto.fullName;
        if (dto.phone !== undefined) t.user.phone = dto.phone;
        await userRepo.save(t.user);

        if (dto.workingAddress !== undefined)
          t.workingAddress = dto.workingAddress;
        if (dto.bio !== undefined) t.bio = dto.bio;
        if (dto.skills !== undefined) t.skills = dto.skills;
        if (dto.bankName !== undefined) t.bankName = dto.bankName;
        if (dto.bankAccountNumber !== undefined)
          t.bankAccountNumber = dto.bankAccountNumber;
        if (dto.bankAccountName !== undefined)
          t.bankAccountName = dto.bankAccountName;
        t.updatedBy = adminId ?? t.updatedBy ?? null;
        await taskerRepo.save(t);
        return t;
      });

      const adminNames = await this.resolveAdminNames([
        tasker.docReviewedBy,
        tasker.updatedBy,
      ]);
      return this.mapProfile(tasker, adminNames);
    }, 'Không thể cập nhật thông tin tasker');
  }

  async updateTaskerWorkStatusByAdmin(
    id: string,
    dto: AdminUpdateTaskerWorkStatusDto,
    adminId?: string,
  ): Promise<TaskerProfileResponse> {
    return asyncHandleOperation(async () => {
      const tasker = await this.taskerRepository.findOne({
        where: { id },
        relations: ['user'],
      });
      if (!tasker) throw new NotFoundException('Không tìm thấy tasker');

      if (dto.clearCancelSuspension) {
        tasker.cancelSuspendedUntil = null;
      } else {
        throw new BadRequestException(
          'Admin chỉ có thể mở khóa nhận đơn. Trạng thái online/offline do tasker tự điều chỉnh.',
        );
      }

      tasker.updatedBy = adminId ?? tasker.updatedBy ?? null;
      const saved = await this.taskerRepository.save(tasker);
      const adminNames = await this.resolveAdminNames([
        saved.docReviewedBy,
        saved.updatedBy,
      ]);
      return this.mapProfile(saved, adminNames);
    }, 'Không thể mở khóa nhận đơn cho tasker');
  }

  async approveTasker(
    id: string,
    adminId?: string,
  ): Promise<TaskerProfileResponse> {
    return asyncHandleOperation(async () => {
      const tasker = await this.dataSource.transaction(async (manager) => {
        const taskerRepository = manager.getRepository(TaskerEntity);
        const userRepository = manager.getRepository(UserEntity);

        const tasker = await taskerRepository.findOne({
          where: { id },
          relations: ['user'],
        });
        if (!tasker) throw new NotFoundException('Không tìm thấy tasker');
        if (tasker.docStatus === DocumentStatus.APPROVED)
          throw new BadRequestException('Tasker đã được duyệt');
        // Không "duyệt" để vô tình mở khóa tasker đang bị khóa/chấm dứt.
        if (
          tasker.status === TaskerStatus.SUSPENDED ||
          tasker.status === TaskerStatus.TERMINATED
        ) {
          throw new BadRequestException(
            'Tasker đang bị khóa/chấm dứt. Hãy mở khóa trước khi duyệt.',
          );
        }

        tasker.status = TaskerStatus.ACTIVE;
        tasker.docStatus = DocumentStatus.APPROVED;
        tasker.docReviewedAt = new Date();
        tasker.docReviewedBy = adminId ?? null;
        tasker.updatedBy = adminId ?? null;
        tasker.docNote = null;
        // Dọn dấu vết ban cũ (nếu có) khi đã thành đối tác hoạt động.
        tasker.banReason = null;
        tasker.banEndsAt = null;
        await taskerRepository.save(tasker);

        // Nâng role CUSTOMER → TASKER ngay khi admin duyệt (atomic với approve).
        if (tasker.user && tasker.user.role !== UserRole.TASKER) {
          tasker.user.role = UserRole.TASKER;
          await userRepository.save(tasker.user);
        }

        return tasker;
      });

      this.safeSendEmail(
        this.mailService.sendTaskerApprovedEmail(
          tasker.user.email,
          tasker.user.fullName,
        ),
        'approve',
      );

      return this.mapProfile(tasker);
    }, 'Không thể duyệt tasker');
  }

  async rejectTasker(
    id: string,
    dto: AdminReviewTaskerDto,
    adminId?: string,
  ): Promise<TaskerProfileResponse> {
    return asyncHandleOperation(async () => {
      const tasker = await this.taskerRepository.findOne({
        where: { id },
        relations: ['user'],
      });
      if (!tasker) throw new NotFoundException('Không tìm thấy tasker');
      // Chỉ từ chối hồ sơ đang trong vòng xét duyệt — không từ chối tasker đã
      // duyệt/đang hoạt động (dùng Khóa/Chấm dứt cho trường hợp đó).
      const rejectable: DocumentStatus[] = [
        DocumentStatus.PENDING,
        DocumentStatus.NEED_INFO,
      ];
      if (!rejectable.includes(tasker.docStatus)) {
        throw new BadRequestException(
          'Chỉ có thể từ chối hồ sơ đang chờ duyệt (PENDING/NEED_INFO).',
        );
      }

      tasker.status = TaskerStatus.REJECTED;
      tasker.docStatus = DocumentStatus.REJECTED;
      tasker.docNote = dto.notes;
      tasker.docReviewedAt = new Date();
      tasker.docReviewedBy = adminId ?? null;
      tasker.updatedBy = adminId ?? null;
      await this.taskerRepository.save(tasker);

      this.safeSendEmail(
        this.mailService.sendTaskerRejectedEmail(
          tasker.user.email,
          tasker.user.fullName,
          // Gửi kèm lý do từ chối (chuyển JSON có cấu trúc → văn bản dễ đọc).
          this.buildReviewNotesText(dto.notes),
        ),
        'reject',
      );

      return this.mapProfile(tasker);
    }, 'Không thể từ chối tasker');
  }

  async requestMoreInfo(
    id: string,
    dto: AdminReviewTaskerDto,
    adminId?: string,
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
      tasker.docReviewedBy = adminId ?? null;
      tasker.updatedBy = adminId ?? null;
      await this.taskerRepository.save(tasker);

      // Link bấm thẳng vào trang nộp lại hồ sơ. Applicant NEED_INFO vẫn là CUSTOMER
      // (chưa nâng role tới khi duyệt) nên phải vào /become-partner/signup — đúng nơi
      // menu trong app điều hướng; route /tasker/* sẽ chặn vì chưa có role TASKER.
      // FRONTEND_URL có thể thiếu ở môi trường dev → fallback PORT.
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        `http://localhost:${this.configService.get<number>('PORT') || 5000}`;
      // Phần đầu tiên admin yêu cầu → để link email nhảy & focus đúng ô cần nộp.
      const focusItem = this.getFirstReviewItemId(dto.notes);
      const kycResubmitUrl =
        `${frontendUrl}/become-partner/signup` +
        (focusItem ? `?focus=${encodeURIComponent(focusItem)}` : '');

      this.safeSendEmail(
        this.mailService.sendTaskerRequestInfoEmail(
          tasker.user.email,
          tasker.user.fullName,
          // docNote có thể là JSON có cấu trúc (v:2) từ FE — chuyển sang văn bản
          // dễ đọc trước khi gửi email, tránh lộ chuỗi JSON thô cho tasker.
          this.buildReviewNotesText(dto.notes),
          kycResubmitUrl,
        ),
        'request-info',
      );

      return this.mapProfile(tasker);
    }, 'Không thể yêu cầu bổ sung thông tin');
  }

  /**
   * Chuyển docNote (có thể là JSON có cấu trúc {v:2,...} hoặc text thuần) sang
   * văn bản dễ đọc để hiển thị trong email gửi tasker.
   */
  private buildReviewNotesText(notes: string): string {
    try {
      const parsed = JSON.parse(notes) as {
        v?: number;
        items?: string[];
        itemLabels?: string[];
        itemNotes?: Record<string, string>;
        note?: string;
      };
      if (parsed && parsed.v === 2 && Array.isArray(parsed.items)) {
        const lines = parsed.items.map((id, i) => {
          const label = parsed.itemLabels?.[i] ?? id;
          const reason = parsed.itemNotes?.[id]?.trim();
          return reason ? `• ${label}: ${reason}` : `• ${label}`;
        });
        const blocks: string[] = [];
        if (lines.length > 0) {
          blocks.push(`Các phần cần bổ sung:\n${lines.join('\n')}`);
        }
        const general = parsed.note?.trim();
        if (general) blocks.push(general);
        return (
          blocks.join('\n\n') ||
          'Vui lòng kiểm tra lại toàn bộ giấy tờ và thông tin đã nộp.'
        );
      }
    } catch {
      // notes là plain text cũ — dùng nguyên văn.
    }
    return notes;
  }

  /** Lấy id phần đầu tiên admin yêu cầu nộp lại — dùng cho deep-link trong email. */
  private getFirstReviewItemId(notes: string): string | null {
    try {
      const parsed = JSON.parse(notes) as { v?: number; items?: string[] };
      if (
        parsed &&
        parsed.v === 2 &&
        Array.isArray(parsed.items) &&
        parsed.items.length > 0
      ) {
        return parsed.items[0];
      }
    } catch {
      // notes là plain text cũ — không có phần cụ thể để focus.
    }
    return null;
  }

  async banTasker(
    id: string,
    dto: AdminBanTaskerDto,
    adminId?: string,
  ): Promise<TaskerProfileResponse> {
    return asyncHandleOperation(async () => {
      const result = await this.dataSource.transaction(async (manager) => {
        const taskerRepo = manager.getRepository(TaskerEntity);
        const userRepo = manager.getRepository(UserEntity);
        const penaltyRepo = manager.getRepository(TaskerPenaltyEntity);

        const tasker = await taskerRepo.findOne({
          where: { id },
          relations: ['user'],
        });
        if (!tasker) throw new NotFoundException('Không tìm thấy tasker');
        if (!tasker.user)
          throw new NotFoundException('Không tìm thấy user của tasker');

        if (
          tasker.status === TaskerStatus.SUSPENDED ||
          tasker.status === TaskerStatus.TERMINATED
        ) {
          throw new BadRequestException(
            'Tasker đã bị khóa hoặc chấm dứt hợp đồng',
          );
        }
        // Chỉ khóa đối tác đã duyệt & đang hoạt động; hồ sơ chờ duyệt dùng Từ chối.
        if (tasker.status !== TaskerStatus.ACTIVE) {
          throw new BadRequestException(
            'Chỉ có thể khóa tasker đã được duyệt và đang hoạt động.',
          );
        }

        const isPermanent = dto.type === BanType.PERMANENT;
        const banEndsAt = isPermanent
          ? null
          : new Date(
              Date.now() + (dto.durationDays ?? 7) * 24 * 60 * 60 * 1000,
            );

        tasker.status = isPermanent
          ? TaskerStatus.TERMINATED
          : TaskerStatus.SUSPENDED;
        tasker.banReason = `[${dto.type}] ${dto.reason}`;
        tasker.banEndsAt = banEndsAt;
        tasker.presenceStatus = TASKER_PRESENCE_STATUS.OFFLINE;
        tasker.updatedBy = adminId ?? null;
        await taskerRepo.save(tasker);

        // TEMPORARY: vẫn cho tasker đăng nhập để thấy banner khóa và liên hệ hỗ trợ,
        // nhưng status SUSPENDED sẽ chặn bật online / nhận việc.
        // PERMANENT: vô hiệu đăng nhập + phiên hiện có.
        tasker.user.isActive = !isPermanent;
        await userRepo.save(tasker.user);
        if (isPermanent) {
          await userRepo.increment({ id: tasker.user.id }, 'tokenVersion', 1);
        }

        // Ghi lịch sử kỷ luật.
        await penaltyRepo.save(
          penaltyRepo.create({
            tasker: { id: tasker.id } as TaskerEntity,
            type: dto.type,
            reason: dto.reason,
            banEndsAt,
            createdBy: adminId ?? null,
          }),
        );

        return { tasker, banEndsAt };
      });

      // Hẹn job tự mở khóa khi hết hạn (chỉ ban có thời hạn).
      if (result.banEndsAt) {
        await this.scheduleAutoUnban(id, result.banEndsAt);
      }

      const isPermanent = dto.type === BanType.PERMANENT;
      // Ban vĩnh viễn: kèm link kháng cáo (token) để tasker gửi kháng cáo dù
      // không đăng nhập được.
      const appealUrl = isPermanent
        ? this.appealTokenService.buildAppealUrl(
            this.appealTokenService.sign(
              result.tasker.id,
              result.tasker.user.id,
            ),
          )
        : undefined;

      this.safeSendEmail(
        this.mailService.sendTaskerBannedEmail(
          result.tasker.user.email,
          result.tasker.user.fullName,
          dto.reason,
          { isPermanent, appealUrl },
        ),
        'ban',
      );

      return this.mapProfile(result.tasker);
    }, 'Không thể khóa tasker');
  }

  async unbanTasker(
    id: string,
    adminId?: string,
  ): Promise<TaskerProfileResponse> {
    return asyncHandleOperation(async () => {
      const tasker = await this.dataSource.transaction(async (manager) => {
        const t = await manager.getRepository(TaskerEntity).findOne({
          where: { id },
          relations: ['user'],
        });
        if (!t) throw new NotFoundException('Không tìm thấy tasker');
        // TERMINATED (chấm dứt vĩnh viễn) không mở khóa qua đây.
        if (t.status !== TaskerStatus.SUSPENDED) {
          throw new BadRequestException(
            'Chỉ mở khóa được tasker đang bị khóa có thời hạn (SUSPENDED).',
          );
        }
        await this.restoreFromBan(manager, t, adminId);
        return t;
      });
      return this.mapProfile(tasker);
    }, 'Không thể mở khóa tasker');
  }

  /**
   * Khôi phục tasker đã bị chấm dứt VĨNH VIỄN (TERMINATED) sau kháng cáo hợp lý —
   * hoặc mở khóa SUSPENDED. Tách khỏi unbanTasker để "vĩnh viễn" vẫn có trọng lượng
   * (unban thường từ chối TERMINATED); đây là quyết định chủ động của admin.
   */
  async reinstateTasker(
    id: string,
    adminId?: string,
    reason?: string,
  ): Promise<TaskerProfileResponse> {
    return asyncHandleOperation(async () => {
      const tasker = await this.dataSource.transaction(async (manager) => {
        const t = await manager.getRepository(TaskerEntity).findOne({
          where: { id },
          relations: ['user'],
        });
        if (!t) throw new NotFoundException('Không tìm thấy tasker');
        if (
          t.status !== TaskerStatus.TERMINATED &&
          t.status !== TaskerStatus.SUSPENDED
        ) {
          throw new BadRequestException(
            'Tasker không bị khóa/chấm dứt — không cần khôi phục.',
          );
        }
        await this.restoreFromBan(manager, t, adminId);
        return t;
      });

      // Ghi vết kháng cáo vào log audit (DB đã có updatedBy/updatedAt cho "ai/khi nào").
      this.logger.log(
        `Khôi phục tasker ${id} bởi admin ${adminId ?? 'N/A'}` +
          (reason ? ` — lý do: ${reason}` : ''),
      );

      return this.mapProfile(tasker);
    }, 'Không thể khôi phục tasker');
  }

  /** Tự mở khóa khi job auto-unban tới hạn. Trả về true nếu thực sự mở khóa. */
  async autoUnbanIfExpired(
    taskerId: string,
    expectedBanEndsAt: string,
  ): Promise<boolean> {
    return asyncHandleOperation(
      async () =>
        this.dataSource.transaction(async (manager) => {
          const t = await manager.getRepository(TaskerEntity).findOne({
            where: { id: taskerId },
            relations: ['user'],
          });
          if (!t || t.status !== TaskerStatus.SUSPENDED) return false;
          // Chỉ mở đúng ban đang chờ (banEndsAt khớp) và đã tới hạn — tránh mở
          // nhầm một ban MỚI (admin re-ban) bằng job cũ.
          if (!t.banEndsAt || t.banEndsAt.toISOString() !== expectedBanEndsAt) {
            return false;
          }
          if (t.banEndsAt.getTime() > Date.now()) return false;
          await this.restoreFromBan(manager, t);
          return true;
        }),
      'Không thể tự mở khóa tasker',
    );
  }

  private async scheduleAutoUnban(
    taskerId: string,
    banEndsAt: Date,
  ): Promise<void> {
    const delay = Math.max(0, banEndsAt.getTime() - Date.now());
    try {
      await this.taskerQueue.add(
        TASKER_JOB_AUTO_UNBAN,
        {
          taskerId,
          expectedBanEndsAt: banEndsAt.toISOString(),
        } as AutoUnbanJobData,
        { ...TASKER_JOB_OPTS, delay },
      );
    } catch (err) {
      this.logger.error(
        `Không hẹn được auto-unban cho tasker ${taskerId}`,
        err as Error,
      );
    }
  }

  /** Khôi phục tasker sau khi mở khóa: status theo docStatus + mở lại đăng nhập. */
  private async restoreFromBan(
    manager: EntityManager,
    tasker: TaskerEntity,
    adminId?: string,
  ): Promise<void> {
    tasker.status = this.statusFromDocStatus(tasker.docStatus);
    tasker.banReason = null;
    tasker.banEndsAt = null;
    // adminId null = auto-unban (hệ thống); có giá trị = admin mở khóa thủ công.
    tasker.updatedBy = adminId ?? null;
    await manager.getRepository(TaskerEntity).save(tasker);
    if (tasker.user) {
      tasker.user.isActive = true;
      await manager.getRepository(UserEntity).save(tasker.user);
    }
  }

  /** Map users.id -> fullName cho audit (Duyệt bởi / Cập nhật bởi), gộp 1 query. */
  private async resolveAdminNames(
    ids: (string | null | undefined)[],
  ): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter((id): id is string => !!id))];
    const map = new Map<string, string>();
    if (unique.length === 0) return map;
    const users = await this.dataSource.getRepository(UserEntity).find({
      where: { id: In(unique) },
      withDeleted: true,
    });
    for (const u of users) map.set(u.id, u.fullName);
    return map;
  }

  private statusFromDocStatus(docStatus: DocumentStatus): TaskerStatus {
    switch (docStatus) {
      case DocumentStatus.APPROVED:
        return TaskerStatus.ACTIVE;
      case DocumentStatus.REJECTED:
        return TaskerStatus.REJECTED;
      default:
        // PENDING / NEED_INFO / EXPIRED → quay lại vòng xét duyệt.
        return TaskerStatus.PENDING;
    }
  }

  async deleteProfile(id: string): Promise<{ id: string; deleted: true }> {
    return asyncHandleOperation(async () => {
      const tasker = await this.taskerRepository.findOne({
        where: { id },
        relations: ['user'],
      });
      if (!tasker) throw new NotFoundException('Không tìm thấy tasker');

      // Không cho xóa hồ sơ đã duyệt (đối tác đang hoạt động, có thể đã có ví/đơn).
      if (tasker.docStatus === DocumentStatus.APPROVED) {
        throw new BadRequestException(
          'Không thể xóa hồ sơ đã được duyệt. Hãy dùng chức năng khóa tài khoản nếu cần.',
        );
      }

      // Dọn ảnh KYC (PII) trên Cloudinary trước khi xóa hồ sơ — best-effort,
      // không chặn việc xóa nếu ảnh đã mất. Avatar thuộc user (CUSTOMER) → giữ.
      await this.cleanupTaskerAssets([
        tasker.docFrontUrl,
        tasker.docBackUrl,
        tasker.criminalRecordUrl,
        tasker.healthCertificateUrl,
        tasker.certificateUrl,
      ]);

      // Xóa hẳn hồ sơ → findMyProfile sẽ trả 404 → ứng viên nộp lại từ đầu,
      // không còn ảnh/giấy tờ cũ. User vẫn giữ vai trò CUSTOMER (chưa nâng TASKER).
      await this.taskerRepository.remove(tasker);

      return { id, deleted: true as const };
    }, 'Không thể xóa hồ sơ tasker');
  }

  /** Suy ra Cloudinary public_id từ secure_url để xóa ảnh. */
  private cloudinaryPublicId(url?: string | null): string | null {
    if (!url) return null;
    const m = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
    return m ? m[1] : null;
  }

  /** Xóa nhiều ảnh trên Cloudinary theo URL (best-effort, không ném lỗi ra ngoài). */
  private async cleanupTaskerAssets(
    urls: (string | null | undefined)[],
  ): Promise<void> {
    const ids = urls
      .map((u) => this.cloudinaryPublicId(u))
      .filter((id): id is string => !!id);
    if (ids.length === 0) return;
    await Promise.allSettled(
      ids.map((id) => this.uploadService.deleteImage(id)),
    );
  }

  /** Xóa các ảnh vừa upload khi thao tác thất bại giữa chừng (best-effort). */
  private async cleanupUploadedPublicIds(publicIds: string[]): Promise<void> {
    if (publicIds.length === 0) return;
    await Promise.allSettled(
      publicIds.map((id) => this.uploadService.deleteImage(id)),
    );
  }

  /** Parse docNote dạng JSON có cấu trúc {v:2,...}; trả null nếu là text thuần/hỏng. */
  private parseStructuredReviewNotes(
    raw: string | null | undefined,
  ): StructuredReviewNotes | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as StructuredReviewNotes;
      if (parsed && parsed.v === 2 && Array.isArray(parsed.items)) {
        return parsed;
      }
    } catch {
      // docNote là plain text cũ — không có danh sách phần cụ thể.
    }
    return null;
  }

  /**
   * Bỏ các phần tasker vừa nộp lại khỏi ghi chú review của admin. Trả về chuỗi
   * JSON còn lại nếu vẫn còn phần chưa bổ sung (vd: trường thông tin cá nhân),
   * ngược lại trả null để docNote được xóa và hồ sơ quay về PENDING.
   */
  private removeResolvedReviewItems(
    notes: StructuredReviewNotes | null,
    resolvedItems: Set<string>,
  ): string | null {
    if (!notes) return null;
    const kept = notes.items
      .map((id, index) => ({ id, index }))
      .filter(({ id }) => !resolvedItems.has(id));
    if (kept.length === 0) return null;

    const items = kept.map(({ id }) => id);
    const itemLabels = notes.itemLabels
      ? kept.map(({ id, index }) => notes.itemLabels?.[index] ?? id)
      : undefined;
    let itemNotes: Record<string, string> | undefined;
    if (notes.itemNotes) {
      const entries = items
        .map((id) => [id, notes.itemNotes?.[id]] as const)
        .filter((entry): entry is [string, string] => !!entry[1]);
      if (entries.length > 0) itemNotes = Object.fromEntries(entries);
    }

    return JSON.stringify({
      v: 2,
      items,
      ...(itemLabels ? { itemLabels } : {}),
      ...(itemNotes ? { itemNotes } : {}),
      note: notes.note ?? '',
    } satisfies StructuredReviewNotes);
  }

  /** URL hiện tại của một giấy tờ (ảnh selfie nằm ở user, còn lại ở tasker). */
  private getDocumentUrl(
    tasker: TaskerEntity,
    field: TaskerDocumentUploadField,
  ): string | null {
    switch (field) {
      case 'avatar':
        return tasker.user?.avatarUrl ?? null;
      case 'docFront':
        return tasker.docFrontUrl ?? null;
      case 'docBack':
        return tasker.docBackUrl ?? null;
      case 'criminalRecord':
        return tasker.criminalRecordUrl ?? null;
      case 'healthCertificate':
        return tasker.healthCertificateUrl ?? null;
      case 'certificate':
        return tasker.certificateUrl ?? null;
    }
  }

  private setDocumentUrl(
    tasker: TaskerEntity,
    field: TaskerDocumentUploadField,
    url: string,
  ): void {
    switch (field) {
      case 'avatar':
        if (tasker.user) {
          tasker.user.avatarUrl = url;
        }
        break;
      case 'docFront':
        tasker.docFrontUrl = url;
        break;
      case 'docBack':
        tasker.docBackUrl = url;
        break;
      case 'criminalRecord':
        tasker.criminalRecordUrl = url;
        break;
      case 'healthCertificate':
        tasker.healthCertificateUrl = url;
        break;
      case 'certificate':
        tasker.certificateUrl = url;
        break;
    }
  }

  async getPenalties(id: string): Promise<{ data: unknown[] }> {
    return asyncHandleOperation(async () => {
      const tasker = await this.taskerRepository.findOne({ where: { id } });
      if (!tasker) throw new NotFoundException('Không tìm thấy tasker');
      const penalties = await this.penaltyRepository.find({
        where: { tasker: { id } },
        order: { createdAt: 'DESC' },
      });
      return {
        data: penalties.map((p) => ({
          id: p.id,
          type: p.type,
          reason: p.reason,
          banEndsAt: p.banEndsAt ?? null,
          createdBy: p.createdBy ?? null,
          createdAt: p.createdAt,
        })),
      };
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

  private mapProfile(
    tasker: TaskerEntity,
    adminNames?: Map<string, string>,
  ): TaskerProfileResponse {
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
      addressCurrent: tasker.workingAddress ?? null,
      bio: tasker.bio ?? null,
      experience: tasker.experience ?? null,
      skills: tasker.skills ?? null,
      fullName,
      phone,
      avatarUrl,
      bankName: tasker.bankName ?? null,
      bankAccountNumber: tasker.bankAccountNumber ?? null,
      bankAccountName: tasker.bankAccountName ?? null,
      adminNotes: tasker.docNote ?? null,
      banReason: tasker.banReason ?? null,
      banEndsAt: tasker.banEndsAt ?? null,
      cancelSuspendedUntil: tasker.cancelSuspendedUntil ?? null,
      // Audit: ai duyệt hồ sơ + ai cập nhật gần nhất (kèm tên admin nếu resolve được).
      docReviewedBy: tasker.docReviewedBy ?? null,
      docReviewedByName: tasker.docReviewedBy
        ? (adminNames?.get(tasker.docReviewedBy) ?? null)
        : null,
      updatedBy: tasker.updatedBy ?? null,
      updatedByName: tasker.updatedBy
        ? (adminNames?.get(tasker.updatedBy) ?? null)
        : null,
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
      equipment: {
        status: tasker.equipmentStatus,
        photoUrls: tasker.equipmentPhotoUrls ?? [],
        reviewedAt: tasker.equipmentReviewedAt ?? null,
        reviewedBy: tasker.equipmentReviewedBy ?? null,
        reviewedByName: tasker.equipmentReviewedBy
          ? (adminNames?.get(tasker.equipmentReviewedBy) ?? null)
          : null,
        note: tasker.equipmentNote ?? null,
      },
      stats: {
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
