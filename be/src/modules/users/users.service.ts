import {
  Injectable,
  ConflictException,
  NotFoundException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UserEntity } from './entities/user.entity';
import { CustomerEntity } from '../customer/entity/customer.entity';
import { TaskerEntity } from '../tasker/entity/tasker.entity';
import { MailService } from '../mail/mail.service';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { ResponseHelper } from 'src/common/helpers/response.helper';
import { AppException } from 'src/common/exceptions/app.exception';
import { AuthProvider } from 'src/common/enums/auth-provider.enum';
import { UserRole } from 'src/common/enums/user-role.enum';
import { CreateOAuthUserDto } from './dto/create-oauth-user.dto';
import { StringValue } from 'ms';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
    @InjectRepository(TaskerEntity)
    private readonly taskerRepository: Repository<TaskerEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * @param options.mustChangePassword Buộc đổi mật khẩu ở lần đăng nhập đầu.
   *   Chỉ bật cho tài khoản do admin tạo bằng mật khẩu tạm; luồng tự đăng ký
   *   (auth.register) KHÔNG truyền cờ này nên mặc định false → không bị bắt đổi.
   */
  async create(
    dto: CreateUserDto,
    options?: { mustChangePassword?: boolean },
  ): Promise<UserEntity> {
    return asyncHandleOperation(async () => {
      const existingUser = await this.findByEmail(dto.email);
      if (existingUser) {
        throw new ConflictException('Email đã tồn tại');
      }

      const hashedPassword = await this.hashPassword(dto.password);
      const role = dto.role ?? UserRole.CUSTOMER;
      const mustChangePassword = options?.mustChangePassword ?? false;

      return this.dataSource.transaction(async (manager) => {
        const userRepo = manager.getRepository(UserEntity);
        const user = await userRepo.save(
          userRepo.create({
            email: dto.email,
            fullName: dto.fullName,
            phone: dto.phone,
            password: hashedPassword,
            provider: AuthProvider.LOCAL,
            role,
            // isVerified: admin tạo thì cho đăng nhập được ngay. mustChangePassword
            // do caller quyết định — chỉ admin tạo bằng mật khẩu tạm mới bật.
            isVerified: true,
            mustChangePassword,
          }),
        );

        // Đồng bộ profile 1:1 — CUSTOMER cần customer profile để dùng các luồng
        // khách hàng. TASKER vẫn phải onboarding/KYC nên không tạo profile rỗng.
        if (role === UserRole.CUSTOMER) {
          await manager
            .getRepository(CustomerEntity)
            .save(manager.getRepository(CustomerEntity).create({ user }));
        }

        return user;
      });
    }, 'Lỗi khi tạo người dùng');
  }

  async findAll(query: QueryUsersDto) {
    return asyncHandleOperation(async () => {
      const {
        keyword,
        role,
        isActive,
        isVerified,
        provider,
        deleted,
        page = 1,
        limit = 10,
      } = query;
      const safeLimit = Math.min(limit, 100);
      const qb = this.userRepository.createQueryBuilder('user');

      if (deleted) {
        // Chỉ user đã xóa mềm.
        qb.withDeleted().andWhere('user.deletedAt IS NOT NULL');
      }

      if (keyword) {
        qb.andWhere(
          '(LOWER(user.email) LIKE LOWER(:kw) OR LOWER(user.fullName) LIKE LOWER(:kw))',
          { kw: `%${keyword}%` },
        );
      }
      if (role !== undefined) qb.andWhere('user.role = :role', { role });
      if (isActive !== undefined)
        qb.andWhere('user.isActive = :isActive', { isActive });
      if (isVerified !== undefined)
        qb.andWhere('user.isVerified = :isVerified', { isVerified });
      if (provider !== undefined)
        qb.andWhere('user.provider = :provider', { provider });

      const [data, total] = await qb
        .orderBy('user.createdAt', 'DESC')
        .skip((page - 1) * safeLimit)
        .take(safeLimit)
        .getManyAndCount();

      return ResponseHelper.success(
        { data, total, page, limit: safeLimit },
        'Users fetched',
      );
    }, 'Lỗi khi lấy danh sách users');
  }

  async findOne(id: string): Promise<UserEntity> {
    return asyncHandleOperation(async () => {
      const user = await this.userRepository.findOneBy({ id });
      if (!user) {
        throw new NotFoundException(`Không tìm thấy user với id ${id}`);
      }
      return user;
    }, 'Lỗi khi lấy một người dùng');
  }

  async findOneWithProfile(id: string) {
    return asyncHandleOperation(async () => {
      const user = await this.userRepository.findOneBy({ id });
      if (!user)
        throw new NotFoundException(`Không tìm thấy user với id ${id}`);

      const [customerProfile, taskerProfile] = await Promise.all([
        this.customerRepository.findOne({ where: { user: { id } } }),
        this.taskerRepository.findOne({ where: { user: { id } } }),
      ]);

      return ResponseHelper.success(
        {
          ...user,
          customerProfile: customerProfile
            ? {
                id: customerProfile.id,
                defaultPaymentMethod: customerProfile.defaultPaymentMethod,
                totalBookings: customerProfile.totalBookings,
                totalCancelled: customerProfile.totalCancelled,
              }
            : null,
          taskerProfile: taskerProfile
            ? {
                id: taskerProfile.id,
                status: taskerProfile.status,
                docStatus: taskerProfile.docStatus,
                ratingAvg: taskerProfile.ratingAvg,
                totalCompletedJobs: taskerProfile.totalCompletedJobs,
              }
            : null,
        },
        'User fetched',
      );
    }, 'Lỗi khi lấy chi tiết người dùng');
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return asyncHandleOperation(() => {
      return this.userRepository
        .createQueryBuilder('user')
        .where('user.email = :email', { email })
        .addSelect('user.password')
        .getOne();
    }, 'Lỗi khi tìm người dùng theo email');
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    return asyncHandleOperation(async () => {
      const user = await this.userRepository.findOneBy({ id });
      if (!user) {
        throw new NotFoundException(`Không tìm thấy user với id ${id}`);
      }

      // CHỈ cho sửa fullName/phone (+ password tùy chọn). role/email/provider
      // KHÔNG đổi qua API này: role chỉ đổi qua flow chuyên biệt (duyệt tasker) để
      // không lệch profile; email là định danh (tránh phức tạp unique/verify-reset).
      const patch: Partial<UserEntity> = {};
      if (updateUserDto.fullName !== undefined) {
        patch.fullName = updateUserDto.fullName;
      }
      if (updateUserDto.phone !== undefined) {
        patch.phone = updateUserDto.phone;
      }
      if (updateUserDto.password) {
        patch.password = await this.hashPassword(updateUserDto.password);
      }

      if (Object.keys(patch).length > 0) {
        await this.userRepository.update(id, patch);
      }

      const updatedUser = await this.userRepository.findOneBy({ id });
      if (!updatedUser) {
        throw new NotFoundException(`Không tìm thấy user với id ${id}`);
      }
      return updatedUser;
    }, 'Lỗi khi cập nhật người dùng');
  }

  async updateLastLogin(id: string): Promise<void> {
    return asyncHandleOperation(async () => {
      await this.userRepository.update(id, { lastLogin: new Date() });
    }, 'Lỗi khi cập nhật thời gian đăng nhập');
  }

  async updateProvider(
    id: string,
    provider: AuthProvider,
    providerId: string,
  ): Promise<void> {
    return asyncHandleOperation(async () => {
      await this.userRepository.update(id, { provider, providerId });
    }, 'Lỗi khi cập nhật provider');
  }

  async changePassword(id: string, password: string): Promise<void> {
    return asyncHandleOperation(async () => {
      const passwordHash = await this.hashPassword(password);
      // Đổi mật khẩu xong thì gỡ luôn cờ buộc-đổi (nếu có).
      await this.userRepository.update(id, {
        password: passwordHash,
        mustChangePassword: false,
      });
    }, 'Lỗi khi thay đổi mật khẩu');
  }

  async markAsVerified(id: string): Promise<void> {
    return asyncHandleOperation(async () => {
      await this.userRepository.update(id, { isVerified: true });
    }, 'Lỗi khi xác thực email');
  }

  async toggleUserActiveStatus(
    id: string,
    isActive: boolean,
    requestingUserId?: string,
  ): Promise<UserEntity> {
    return asyncHandleOperation(async () => {
      if (requestingUserId && !isActive && id === requestingUserId) {
        throw new AppException(
          'Không thể tự deactivate tài khoản của mình',
          HttpStatus.FORBIDDEN,
        );
      }
      const user = await this.userRepository.findOneBy({ id });
      if (!user)
        throw new NotFoundException(`Không tìm thấy user với id ${id}`);
      // Không khóa admin cuối cùng đang hoạt động (tránh khóa toàn bộ quản trị).
      if (!isActive) await this.assertNotLastActiveAdmin(user);
      await this.userRepository.update(id, { isActive });
      // Khóa tài khoản → bump tokenVersion để vô hiệu refresh token đang có.
      if (!isActive) {
        await this.userRepository.increment({ id }, 'tokenVersion', 1);
      }
      return { ...user, isActive };
    }, 'Lỗi khi cập nhật trạng thái người dùng');
  }

  async softRemove(id: string, requestingUserId: string) {
    return asyncHandleOperation(async () => {
      if (id === requestingUserId) {
        throw new AppException(
          'Không thể tự xóa tài khoản của mình',
          HttpStatus.FORBIDDEN,
        );
      }
      const user = await this.userRepository.findOneBy({ id });
      if (!user)
        throw new NotFoundException(`Không tìm thấy user với id ${id}`);
      await this.assertNotLastActiveAdmin(user);
      await this.userRepository.softDelete(id);
      // Xóa mềm → bump tokenVersion để vô hiệu refresh token đang có.
      await this.userRepository.increment({ id }, 'tokenVersion', 1);
      return ResponseHelper.success(null, 'User deleted');
    }, 'Lỗi khi xóa người dùng');
  }

  async restore(id: string) {
    return asyncHandleOperation(async () => {
      const user = await this.userRepository.findOne({
        where: { id },
        withDeleted: true,
      });
      if (!user)
        throw new NotFoundException(`Không tìm thấy user với id ${id}`);
      if (!user.deletedAt) {
        throw new AppException('User chưa bị xóa', HttpStatus.BAD_REQUEST);
      }
      await this.userRepository.restore(id);
      const restored = await this.userRepository.findOneBy({ id });
      return ResponseHelper.success({ user: restored }, 'User restored');
    }, 'Lỗi khi khôi phục người dùng');
  }

  async sendPasswordResetEmail(id: string) {
    return asyncHandleOperation(async () => {
      const user = await this.userRepository.findOneBy({ id });
      if (!user)
        throw new NotFoundException(`Không tìm thấy user với id ${id}`);
      if (user.provider !== AuthProvider.LOCAL) {
        throw new AppException(
          'Tài khoản đăng nhập qua mạng xã hội — không dùng mật khẩu để đặt lại.',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!user.isActive) {
        throw new AppException(
          'Tài khoản đang bị khóa — không gửi email đặt lại mật khẩu.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const token = this.jwtService.sign(
        { sub: user.id, email: user.email },
        {
          secret: this.configService.get<string>('JWT_RESET_PASSWORD_SECRET'),
          expiresIn: this.configService.get<string>(
            'JWT_RESET_PASSWORD_EXPIRES_IN',
          ) as StringValue,
        },
      );

      const resetUrl = `${this.configService.get<string>('FRONTEND_URL')}/auth/reset-password?token=${token}`;
      await this.mailService.sendResetPasswordEmail(
        user.email,
        user.fullName,
        resetUrl,
      );
      return ResponseHelper.success(null, 'Password reset email sent');
    }, 'Lỗi khi gửi email reset mật khẩu');
  }

  async createOAuthUser(dto: CreateOAuthUserDto): Promise<UserEntity> {
    return asyncHandleOperation(async () => {
      const user = this.userRepository.create({
        email: dto.email,
        fullName: dto.fullName,
        provider: dto.provider,
        providerId: dto.providerId,
        avatarUrl: dto.avatar,
        isVerified: true,
        isActive: true,
      });

      return await this.userRepository.save(user);
    }, 'Lỗi khi tạo người dùng Facebook');
  }

  /** Chặn khóa/xóa admin cuối cùng đang hoạt động (tránh mất toàn bộ quản trị). */
  private async assertNotLastActiveAdmin(target: UserEntity): Promise<void> {
    if (target.role !== UserRole.ADMIN) return;
    const activeAdmins = await this.userRepository.count({
      where: { role: UserRole.ADMIN, isActive: true },
    });
    if (activeAdmins <= 1) {
      throw new AppException(
        'Không thể khóa/xóa admin cuối cùng đang hoạt động.',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}
