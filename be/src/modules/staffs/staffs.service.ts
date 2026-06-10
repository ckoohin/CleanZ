import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffEntity } from './entities/staff.entity';
import { UpdateStaffProfileDto } from './dto/update-staff-profile.dto';
import { StaffProfileResponseDto } from './dto/staff-profile-response.dto';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { UserRole } from 'src/common/enums/user-role.enum';
import { APPROVAL_STATUS } from 'src/common/enums/approval-status.enum';
import { User } from '../users/entities/user.entity';
import { StaffPresenceEntity } from './entities/staff-presence.entity';
import { STAFF_PRESENCE_STATUS } from 'src/common/enums/staff-presence-status.enum';
import {
  assertCanAccess,
  assertCanUpdate,
} from 'src/common/helpers/file.helper';
import { MailService } from '../mail/mail.service';
import { toStaffProfileResponseDto } from './mapper/staff.mapper';
import { StaffPresenceResponseDto } from './dto/staff-presence-response.dto';
import { UpdateStaffPresenceDto } from './dto/update-staff-presence.dto';
import { DataSource } from 'typeorm';
import { StaffUploadService } from './staff-upload.service';
import { StaffServiceEntity } from './entities/staff-service.entity';
import { ServiceEntity } from '../services/entities/service.entity';
import { CreateStaffServiceDto } from './dto/create-staff-service.dto';
import { UpdateStaffServiceDto } from './dto/update-staff-service.dto';
import { ServiceLocationType } from 'src/common/enums/service-location-type.enum';
import {
  toStaffServiceResponseDto,
  toStaffServiceResponseDtoList,
} from './mapper/staff-service.mapper';
import { StaffDocumentEntity } from './entities/staff-document.entity';
import { StaffPenaltyEntity } from './entities/staff-penalty.entity';
import { PenaltyType } from 'src/common/enums/penalty-type.enum';
import { BanStaffDto } from './dto/ban-staff.dto';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class StaffsService {
  constructor(
    @InjectRepository(StaffEntity)
    private readonly staffRepository: Repository<StaffEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(StaffPresenceEntity)
    private readonly staffPresenceRepository: Repository<StaffPresenceEntity>,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
    private readonly staffUploadService: StaffUploadService,
    @InjectRepository(StaffDocumentEntity)
    private readonly staffDocumentRepository: Repository<StaffDocumentEntity>,
    @InjectRepository(StaffPenaltyEntity)
    private readonly staffPenaltyRepository: Repository<StaffPenaltyEntity>,
    @InjectRepository(StaffServiceEntity)
    private readonly staffServiceRepository: Repository<StaffServiceEntity>,
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
    private readonly uploadService: UploadService,
  ) {}

  async findAll(query: {
    status?: APPROVAL_STATUS;
    keyword?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, keyword, page = 1, limit = 10 } = query;
    const qb = this.staffRepository
      .createQueryBuilder('staff')
      .leftJoinAndSelect('staff.user', 'user')
      .leftJoinAndSelect('staff.documents', 'documents');

    if (status) {
      qb.andWhere('staff.approvalStatus = :status', { status });
    }

    if (keyword) {
      qb.andWhere(
        '(LOWER(user.fullName) LIKE LOWER(:keyword) OR user.phone LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    qb.orderBy('staff.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      data: items.map((item) => toStaffProfileResponseDto(item)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createProfileStaff(
    userId: string,
    requestUserId: string,
    requestUserRole: UserRole,
  ): Promise<StaffProfileResponseDto> {
    return asyncHandleOperation(async () => {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('Người dùng không tồn tại');
      }

      assertCanAccess(
        requestUserId,
        userId,
        requestUserRole,
        'Bạn không có quyền tạo hồ sơ staff cho người dùng khác',
      );

      const existingProfile = await this.staffRepository.findOne({
        where: { user: { id: userId } },
        relations: ['user'],
      });

      if (existingProfile) {
        throw new ConflictException('Hồ sơ đã tồn tại.');
      }

      const newProfile = this.staffRepository.create({
        user: { id: userId },
      });

      let savedProfile: StaffEntity;
      try {
        savedProfile = await this.staffRepository.save(newProfile);
      } catch (error: unknown) {
        const err = error as { code?: string };
        if (err.code === '23505') {
          throw new ConflictException('Hồ sơ đã tồn tại.');
        }
        throw error;
      }
      return toStaffProfileResponseDto(
        await this.findStaffOrFail(savedProfile.id),
      );
    }, 'Lỗi khi tạo hồ sơ staff');
  }

  async getProfileStaff(
    requestUserId: string,
    requestUserRole: UserRole,
  ): Promise<StaffProfileResponseDto> {
    const staff = await this.staffRepository.findOne({
      where: { user: { id: requestUserId } },
      relations: ['user', 'documents'],
    });
    if (!staff) throw new NotFoundException('Không tìm thấy hồ sơ staff');
    if (requestUserRole !== UserRole.ADMIN && staff.user.id !== requestUserId) {
      throw new ForbiddenException('Bạn không có quyền truy cập hồ sơ này');
    }
    return toStaffProfileResponseDto(staff);
  }

  async update(
    id: string,
    dto: UpdateStaffProfileDto,
    requestUserId: string,
    requestUserRole: UserRole,
  ): Promise<StaffProfileResponseDto> {
    return asyncHandleOperation(async () => {
      const staffProfile = await this.findStaffOrFail(id);
      assertCanUpdate(staffProfile, requestUserId, requestUserRole);

      Object.assign(staffProfile, dto);
      const updated = await this.staffRepository.save(staffProfile);

      return toStaffProfileResponseDto(updated);
    }, 'Lỗi khi cập nhật thông tin staff');
  }

  async updateAvatar(
    id: string,
    file: Express.Multer.File,
    requestUserId: string,
    requestUserRole: UserRole,
  ): Promise<StaffProfileResponseDto> {
    return this.staffUploadService.updateAvatar(
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
  ): Promise<StaffProfileResponseDto> {
    return this.staffUploadService.updateDocuments(
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
    return this.staffUploadService.getDocumentPaths(
      id,
      type,
      requestUserId,
      requestUserRole,
    );
  }

  async approveStaff(
    id: string,
    adminId: string,
  ): Promise<{ message: string; staff: StaffProfileResponseDto }> {
    return asyncHandleOperation(async () => {
      const staffProfile = await this.findStaffOrFail(id);
      if (staffProfile.approvalStatus === APPROVAL_STATUS.APPROVED) {
        throw new BadRequestException('Staff đã được phê duyệt trước đó');
      }
      let adminName: string | undefined = undefined;
      let userEmail: string = staffProfile.user.email;
      let userFullName: string = staffProfile.user.fullName;

      await this.dataSource.transaction(async (tx) => {
        staffProfile.approvalStatus = APPROVAL_STATUS.APPROVED;
        staffProfile.lastChangedByAdminId = adminId;
        staffProfile.adminNotes = undefined; // Clear notes when approved

        const admin = await tx.findOne(User, {
          where: { id: adminId },
          select: ['id', 'fullName'],
        });
        adminName = admin?.fullName;
        staffProfile.lastChangedByAdminName = adminName;

        await tx.save(staffProfile);
        const user = await tx.findOne(User, {
          where: { id: staffProfile.user.id },
        });
        if (!user) throw new NotFoundException('Người dùng không tồn tại');
        userEmail = user.email;
        userFullName = user.fullName;
        user.role = UserRole.TASKER;
        await tx.save(user);

        const existingPresence = await tx.findOne(StaffPresenceEntity, {
          where: { staff: { id: staffProfile.id } },
        });

        if (!existingPresence) {
          const staffPresence = tx.create(StaffPresenceEntity, {
            staff: staffProfile,
            status: STAFF_PRESENCE_STATUS.OFFLINE,
            isBusy: false,
          });
          await tx.save(staffPresence);
        }
      });
      const finalStaff = await this.findStaffOrFail(id);
      await this.mailService
        .sendStaffApprovedEmail(userEmail, userFullName)
        .catch(() => {});

      return {
        message: 'Phê duyệt hồ sơ staff thành công',
        staff: toStaffProfileResponseDto(finalStaff),
      };
    }, 'Lỗi khi phê duyệt staff');
  }

  async rejectStaff(
    id: string,
    adminId: string,
    notes: string,
  ): Promise<{ message: string; staff: StaffProfileResponseDto }> {
    return asyncHandleOperation(async () => {
      const staffProfile = await this.findStaffOrFail(id);

      let adminName: string | undefined = undefined;
      const userEmail = staffProfile.user.email;
      const userFullName = staffProfile.user.fullName;

      await this.dataSource.transaction(async (tx) => {
        staffProfile.approvalStatus = APPROVAL_STATUS.REJECTED;
        staffProfile.lastChangedByAdminId = adminId;
        staffProfile.adminNotes = notes;

        const admin = await tx.findOne(User, {
          where: { id: adminId },
          select: ['id', 'fullName'],
        });
        adminName = admin?.fullName;
        staffProfile.lastChangedByAdminName = adminName;

        await tx.save(staffProfile);
        const user = await tx.findOne(User, {
          where: { id: staffProfile.user.id },
        });
        if (!user) throw new NotFoundException('Người dùng không tồn tại');
        user.role = UserRole.CUSTOMER;
        await tx.save(user);
      });

      const finalStaff = await this.findStaffOrFail(id);
      // Bạn có thể tạo thêm template mail cho trường hợp bị từ chối kèm lý do
      await this.mailService
        .sendStaffRejectedEmail(userEmail, userFullName)
        .catch(() => {});

      return {
        message: 'Từ chối hồ sơ staff thành công',
        staff: toStaffProfileResponseDto(finalStaff),
      };
    }, 'Lỗi khi từ chối staff');
  }

  async requestMoreInfo(
    id: string,
    adminId: string,
    notes: string,
  ): Promise<{ message: string; staff: StaffProfileResponseDto }> {
    return asyncHandleOperation(async () => {
      const staffProfile = await this.findStaffOrFail(id);

      let adminName: string | undefined = undefined;

      await this.dataSource.transaction(async (tx) => {
        staffProfile.approvalStatus = APPROVAL_STATUS.NEED_INFO;
        staffProfile.lastChangedByAdminId = adminId;
        staffProfile.adminNotes = notes;

        const admin = await tx.findOne(User, {
          where: { id: adminId },
          select: ['id', 'fullName'],
        });
        adminName = admin?.fullName;
        staffProfile.lastChangedByAdminName = adminName;

        await tx.save(staffProfile);
      });

      const finalStaff = await this.findStaffOrFail(id);

      // TODO: Gửi mail thông báo yêu cầu bổ sung thông tin kèm notes

      return {
        message: 'Đã gửi yêu cầu bổ sung thông tin',
        staff: toStaffProfileResponseDto(finalStaff),
      };
    }, 'Lỗi khi yêu cầu bổ sung thông tin');
  }

  async banStaff(
    id: string,
    adminId: string,
    dto: BanStaffDto,
  ): Promise<{ message: string }> {
    return asyncHandleOperation(async () => {
      const staffProfile = await this.findStaffOrFail(id);

      const penalty = this.staffPenaltyRepository.create({
        staff: staffProfile,
        reason: dto.reason,
        type: dto.type,
        createdBy: { id: adminId } as User,
        startsAt: new Date(),
      });

      const now = new Date();
      if (dto.type === PenaltyType.DAYS_2) {
        penalty.endsAt = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      } else if (dto.type === PenaltyType.DAYS_7) {
        penalty.endsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      } else if (dto.type === PenaltyType.PERMANENT) {
        penalty.endsAt = null;
        // Also deactivate user
        await this.userRepository.update(staffProfile.user.id, {
          isActive: false,
        });
      }

      await this.staffPenaltyRepository.save(penalty);

      return { message: 'Khóa tài khoản staff thành công' };
    }, 'Lỗi khi khóa tài khoản staff');
  }

  async unbanStaff(id: string, adminId: string): Promise<{ message: string }> {
    return asyncHandleOperation(async () => {
      const staffProfile = await this.findStaffOrFail(id);

      // Find active penalty
      const penalty = await this.staffPenaltyRepository
        .createQueryBuilder('penalty')
        .where('penalty.staff = :staffId', { staffId: staffProfile.id })
        .andWhere('(penalty.endsAt > :now OR penalty.endsAt IS NULL)', {
          now: new Date(),
        })
        .orderBy('penalty.createdAt', 'DESC')
        .getOne();

      if (penalty) {
        penalty.endsAt = new Date(); // Set to now to expire it
        await this.staffPenaltyRepository.save(penalty);
      }

      // Also ensure user is active (if it was permanent ban)
      await this.userRepository.update(staffProfile.user.id, {
        isActive: true,
      });

      return { message: 'Gỡ khóa tài khoản staff thành công' };
    }, 'Lỗi khi gỡ khóa tài khoản staff');
  }

  async isBanned(staffId: string): Promise<boolean> {
    const penalty = await this.staffPenaltyRepository
      .createQueryBuilder('penalty')
      .where('penalty.staff = :staffId', { staffId })
      .andWhere('(penalty.endsAt > :now OR penalty.endsAt IS NULL)', {
        now: new Date(),
      })
      .getOne();

    return !!penalty;
  }

  async getPenalties(id: string) {
    return this.staffPenaltyRepository.find({
      where: { staff: { id } },
      order: { createdAt: 'DESC' },
      relations: ['createdBy'],
    });
  }

  async getMyPresence(
    userId: string,
    userRole: UserRole,
  ): Promise<StaffPresenceResponseDto> {
    return asyncHandleOperation(async () => {
      const staffProfile = await this.findApprovedStaffByUserOrFail(
        userId,
        userRole,
      );
      const staffPresence = await this.getOrCreateStaffPresence(staffProfile);

      return this.toStaffPresenceResponseDto(staffPresence);
    }, 'Lỗi khi lấy trạng thái hoạt động của staff');
  }

  async updateMyPresence(
    userId: string,
    userRole: UserRole,
    dto: UpdateStaffPresenceDto,
  ): Promise<StaffPresenceResponseDto> {
    return asyncHandleOperation(async () => {
      const staffProfile = await this.findApprovedStaffByUserOrFail(
        userId,
        userRole,
      );
      const staffPresence = await this.getOrCreateStaffPresence(staffProfile);

      staffPresence.status = dto.status;
      const updatedPresence =
        await this.staffPresenceRepository.save(staffPresence);

      return this.toStaffPresenceResponseDto(updatedPresence);
    }, 'Lỗi khi cập nhật trạng thái hoạt động của staff');
  }

  async getAllStaffDocuments(
    staffId: string,
    requestUserId: string,
    requestUserRole: UserRole,
  ) {
    return this.staffUploadService.getAllStaffDocuments(
      staffId,
      requestUserId,
      requestUserRole,
    );
  }

  async findStaffById(
    id: string,
    requestUserId: string,
    requestUserRole: UserRole,
  ): Promise<StaffProfileResponseDto> {
    const staff = await this.findStaffOrFail(id);

    if (requestUserRole === UserRole.ADMIN) {
      return toStaffProfileResponseDto(staff);
    }

    if (staff.user.id === requestUserId) {
      return toStaffProfileResponseDto(staff);
    }

    if (staff.approvalStatus !== APPROVAL_STATUS.APPROVED) {
      throw new NotFoundException('Không tìm thấy thông tin staff');
    }

    return toStaffProfileResponseDto(staff);
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

  private async findStaffByUserId(userId: string): Promise<StaffEntity | null> {
    return this.staffRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user', 'documents', 'staffPresence'],
    });
  }

  private async findApprovedStaffByUserOrFail(
    userId: string,
    userRole: UserRole,
  ): Promise<StaffEntity> {
    if (userRole !== UserRole.TASKER) {
      throw new ForbiddenException('Bạn không thể thực hiện hành động này.');
    }

    const staff = await this.findStaffByUserId(userId);

    if (!staff) {
      throw new NotFoundException('Không tìm thấy hồ sơ staff');
    }

    if (staff.approvalStatus !== APPROVAL_STATUS.APPROVED) {
      throw new ForbiddenException(
        'Staff chưa được phê duyệt để bật trạng thái hoạt động',
      );
    }

    return staff;
  }

  private async getOrCreateStaffPresence(
    staff: StaffEntity,
  ): Promise<StaffPresenceEntity> {
    const existingPresence = await this.staffPresenceRepository.findOne({
      where: { staff: { id: staff.id } },
      relations: ['staff'],
    });

    if (existingPresence) {
      return existingPresence;
    }

    const staffPresence = this.staffPresenceRepository.create({
      staff,
      status: STAFF_PRESENCE_STATUS.OFFLINE,
      isBusy: false,
    });

    return this.staffPresenceRepository.save(staffPresence);
  }

  private toStaffPresenceResponseDto(
    staffPresence: StaffPresenceEntity,
  ): StaffPresenceResponseDto {
    return {
      staffId: staffPresence.staff.id,
      status: staffPresence.status,
      isBusy: staffPresence.isBusy,
      createdAt: staffPresence.createdAt,
      updatedAt: staffPresence.updatedAt,
    };
  }

  // ─── Staff Services CRUD ───────────────────────────────

  async createStaffService(
    staffId: string,
    dto: CreateStaffServiceDto,
    requestUserId: string,
    requestUserRole: UserRole,
  ) {
    return asyncHandleOperation(async () => {
      const staff = await this.findStaffOrFail(staffId);
      assertCanUpdate(staff, requestUserId, requestUserRole);

      const service = await this.serviceRepository.findOne({
        where: { id: dto.serviceId, isActive: true },
      });
      if (!service) {
        throw new NotFoundException(
          'Không tìm thấy dịch vụ hoặc dịch vụ đã bị ẩn',
        );
      }

      const invalidTypes = dto.locationTypes.filter(
        (lt) => !service.supportedLocationTypes.includes(lt),
      );
      if (invalidTypes.length > 0) {
        throw new BadRequestException(
          `Dịch vụ "${service.name}" không hỗ trợ loại: ${invalidTypes.join(', ')}. Chỉ hỗ trợ: ${service.supportedLocationTypes.join(', ')}`,
        );
      }

      if (
        dto.locationTypes.includes(ServiceLocationType.AT_SHOP) &&
        !dto.shopAddress
      ) {
        throw new BadRequestException(
          'Địa chỉ quán bắt buộc khi dịch vụ tại quán (at_shop)',
        );
      }

      const existing = await this.staffServiceRepository.findOne({
        where: {
          staff: { id: staffId },
          service: { id: dto.serviceId },
        },
      });
      if (existing) {
        throw new ConflictException('Bạn đã đăng ký dịch vụ này rồi');
      }

      const staffService = this.staffServiceRepository.create({
        staff: { id: staffId } as StaffEntity,
        service: { id: dto.serviceId } as ServiceEntity,
        locationTypes: dto.locationTypes,
        customPrice: dto.customPrice,
        description: dto.description,
        shopAddress: dto.shopAddress,
      });

      const saved = await this.staffServiceRepository.save(staffService);

      const result = await this.staffServiceRepository.findOne({
        where: { id: saved.id },
        relations: ['service', 'service.category'],
      });

      return toStaffServiceResponseDto(result!);
    }, 'Lỗi khi đăng ký dịch vụ cho staff');
  }

  async getStaffServices(staffId: string) {
    const staff = await this.staffRepository.findOne({
      where: { id: staffId },
    });
    if (!staff) {
      throw new NotFoundException('Không tìm thấy staff');
    }

    const staffServices = await this.staffServiceRepository.find({
      where: { staff: { id: staffId }, isAvailable: true },
      relations: ['service', 'service.category'],
      order: { createdAt: 'DESC' },
    });

    return toStaffServiceResponseDtoList(staffServices);
  }

  async updateStaffService(
    staffId: string,
    staffServiceId: string,
    dto: UpdateStaffServiceDto,
    requestUserId: string,
    requestUserRole: UserRole,
  ) {
    return asyncHandleOperation(async () => {
      const staff = await this.findStaffOrFail(staffId);
      assertCanUpdate(staff, requestUserId, requestUserRole);

      const staffService = await this.staffServiceRepository.findOne({
        where: { id: staffServiceId, staff: { id: staffId } },
        relations: ['service', 'service.category'],
      });
      if (!staffService) {
        throw new NotFoundException('Không tìm thấy dịch vụ đã đăng ký');
      }

      if (dto.locationTypes) {
        const invalidTypes = dto.locationTypes.filter(
          (lt) => !staffService.service.supportedLocationTypes.includes(lt),
        );
        if (invalidTypes.length > 0) {
          throw new BadRequestException(
            `Dịch vụ "${staffService.service.name}" không hỗ trợ loại: ${invalidTypes.join(', ')}`,
          );
        }

        if (
          dto.locationTypes.includes(ServiceLocationType.AT_SHOP) &&
          !dto.shopAddress &&
          !staffService.shopAddress
        ) {
          throw new BadRequestException(
            'Địa chỉ quán bắt buộc khi dịch vụ tại quán (at_shop)',
          );
        }
      }

      Object.assign(staffService, dto);
      const updated = await this.staffServiceRepository.save(staffService);

      return toStaffServiceResponseDto(updated);
    }, 'Lỗi khi cập nhật dịch vụ staff');
  }

  async deleteStaffService(
    staffId: string,
    staffServiceId: string,
    requestUserId: string,
    requestUserRole: UserRole,
  ) {
    return asyncHandleOperation(async () => {
      const staff = await this.findStaffOrFail(staffId);
      assertCanUpdate(staff, requestUserId, requestUserRole);

      const staffService = await this.staffServiceRepository.findOne({
        where: { id: staffServiceId, staff: { id: staffId } },
      });
      if (!staffService) {
        throw new NotFoundException('Không tìm thấy dịch vụ đã đăng ký');
      }

      await this.staffServiceRepository.remove(staffService);

      return { message: 'Đã xóa dịch vụ thành công' };
    }, 'Lỗi khi xóa dịch vụ staff');
  }

  async findStaffServiceById(id: string): Promise<StaffServiceEntity> {
    const staffService = await this.staffServiceRepository.findOne({
      where: { id },
      relations: ['service', 'service.category', 'staff', 'staff.user'],
    });
    if (!staffService) {
      throw new NotFoundException('Không tìm thấy dịch vụ staff');
    }
    return staffService;
  }
}
