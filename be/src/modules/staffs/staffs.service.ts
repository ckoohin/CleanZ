/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
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
import { UploadService } from '../upload/upload.service';
import { STAFF_PRESENCE_STATUS } from 'src/common/enums/staff-presence-status.enum';

// type DocumentType = (typeof VALID_DOCUMENT_TYPES)[number];

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
    @InjectRepository(StaffServiceEntity)
    private readonly staffServiceRepository: Repository<StaffServiceEntity>,
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
    private readonly uploadService: UploadService,
  ) {}

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
        const admin = await tx.findOne(User, {
          where: { id: adminId },
          select: ['id', 'fullName'],
        });
        adminName = admin?.fullName;
        await tx.save(staffProfile);
        const user = await tx.findOne(User, {
          where: { id: staffProfile.user.id },
        });
        if (!user) throw new NotFoundException('Người dùng không tồn tại');
        userEmail = user.email;
        userFullName = user.fullName;
        user.role = UserRole.STAFF;
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
        staff: toStaffProfileResponseDto({
          ...finalStaff,
          lastChangedByAdminName: adminName,
        }),
      };
    }, 'Lỗi khi phê duyệt staff');
  }
  async rejectStaff(
    id: string,
    adminId: string,
  ): Promise<{ message: string; staff: StaffProfileResponseDto }> {
    return asyncHandleOperation(async () => {
      const staffProfile = await this.findStaffOrFail(id);
      if (staffProfile.approvalStatus === APPROVAL_STATUS.REJECTED) {
        throw new BadRequestException('Staff đã bị từ chối trước đó');
      }

      let adminName: string | undefined = undefined;
      const userEmail = staffProfile.user.email;
      const userFullName = staffProfile.user.fullName;

      await this.dataSource.transaction(async (tx) => {
        staffProfile.approvalStatus = APPROVAL_STATUS.REJECTED;
        staffProfile.lastChangedByAdminId = adminId;

        const admin = await tx.findOne(User, {
          where: { id: adminId },
          select: ['id', 'fullName'],
        });
        adminName = admin?.fullName;
        await tx.save(staffProfile);
        const user = await tx.findOne(User, {
          where: { id: staffProfile.user.id },
        });
        if (!user) throw new NotFoundException('Người dùng không tồn tại');
        user.role = UserRole.CUSTOMER;
        await tx.save(user);
      });
      const finalStaff = await this.findStaffOrFail(id);
      await this.mailService
        .sendStaffRejectedEmail(userEmail, userFullName)
        .catch(() => {});

      return {
        message: 'Từ chối hồ sơ staff thành công',
        staff: toStaffProfileResponseDto({
          ...finalStaff,
          lastChangedByAdminName: adminName,
        }),
      };
    }, 'Lỗi khi từ chối staff');
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
    if (userRole !== UserRole.STAFF) {
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

      // Reload with relations
      const result = await this.staffServiceRepository.findOne({
        where: { id: saved.id },
        relations: ['service'],
      });

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
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
      relations: ['service'],
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
        relations: ['service'],
      });
      if (!staffService) {
        throw new NotFoundException('Không tìm thấy dịch vụ đã đăng ký');
      }

      // Validate locationTypes nếu có update
      if (dto.locationTypes) {
        const invalidTypes = dto.locationTypes.filter(
          (lt) => !staffService.service.supportedLocationTypes.includes(lt),
        );
        if (invalidTypes.length > 0) {
          throw new BadRequestException(
            `Dịch vụ "${staffService.service.name}" không hỗ trợ loại: ${invalidTypes.join(', ')}`,
          );
        }

        // Validate shopAddress khi chuyển sang AT_SHOP
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
      relations: ['service', 'staff', 'staff.user'],
    });
    if (!staffService) {
      throw new NotFoundException('Không tìm thấy dịch vụ staff');
    }
    return staffService;
  }
}
