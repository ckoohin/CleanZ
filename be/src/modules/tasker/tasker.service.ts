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
import { UploadService } from 'src/modules/upload/upload.service';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { DataSource, Repository } from 'typeorm';
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
  ) {}

  async submitProfile(
    userId: string,
    dto: SubmitTaskerProfileDto,
    files: {
      docFront?: Express.Multer.File[];
      docBack?: Express.Multer.File[];
    },
  ): Promise<TaskerProfileResponse> {
    return asyncHandleOperation(async () => {
      const docFront = files.docFront?.[0];
      const docBack = files.docBack?.[0];
      if (!docFront || !docBack) {
        throw new BadRequestException(
          'Vui lòng upload đủ ảnh mặt trước và mặt sau căn cước',
        );
      }

      const [frontUpload, backUpload] = await Promise.all([
        this.uploadService.uploadImage(docFront),
        this.uploadService.uploadImage(docBack),
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
        await userRepository.save(user);

        tasker = taskerRepository.create({
          ...(tasker ?? {}),
          user,
          workingAddress: dto.workingAddress?.trim() || null,
          status: TaskerStatus.PENDING,
          docType: dto.docType,
          docIdNumber: dto.docIdNumber,
          docFrontUrl: frontUpload.url,
          docBackUrl: backUpload.url,
          docIssuedDate: dto.docIssuedDate ? new Date(dto.docIssuedDate) : null,
          docExpiredDate: dto.docExpiredDate
            ? new Date(dto.docExpiredDate)
            : null,
          docStatus: DocumentStatus.PENDING,
          docReviewedAt: null,
          docNote: null,
        });

        return taskerRepository.save(tasker);
      });

      return this.mapProfile(tasker);
    }, 'Không thể nộp hồ sơ tasker');
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

  private mapProfile(tasker: TaskerEntity): TaskerProfileResponse {
    return {
      id: tasker.id,
      status: tasker.status,
      workingAddress: tasker.workingAddress ?? null,
      user: {
        id: tasker.user?.id ?? null,
        email: tasker.user?.email ?? null,
        fullName: tasker.user?.fullName ?? null,
        phone: tasker.user?.phone ?? null,
        avatarUrl: tasker.user?.avatarUrl ?? null,
      },
      document: {
        type: tasker.docType ?? null,
        idNumber: tasker.docIdNumber ?? null,
        frontUrl: tasker.docFrontUrl ?? null,
        backUrl: tasker.docBackUrl ?? null,
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
