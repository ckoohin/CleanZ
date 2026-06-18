import {
  Injectable,
  ConflictException,
  NotFoundException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

  async create(dto: CreateUserDto): Promise<UserEntity> {
    return asyncHandleOperation(async () => {
      const existingUser = await this.findByEmail(dto.email);

      if (existingUser) {
        throw new ConflictException('Email đã tồn tại');
      }

      const hashedPassword = await this.hashPassword(dto.password);

      const user = this.userRepository.create({
        email: dto.email,
        fullName: dto.fullName,
        phone: dto.phone,
        password: hashedPassword,
        provider: AuthProvider.LOCAL,
        role: dto.role,
      });

      return await this.userRepository.save(user);
    }, 'Lỗi khi tạo người dùng');
  }

  async findAll(query: QueryUsersDto) {
    return asyncHandleOperation(async () => {
      const { keyword, role, isActive, isVerified, provider, page = 1, limit = 10 } = query;
      const safeLimit = Math.min(limit, 100);
      const qb = this.userRepository.createQueryBuilder('user');

      if (keyword) {
        qb.andWhere(
          '(LOWER(user.email) LIKE LOWER(:kw) OR LOWER(user.fullName) LIKE LOWER(:kw))',
          { kw: `%${keyword}%` },
        );
      }
      if (role !== undefined) qb.andWhere('user.role = :role', { role });
      if (isActive !== undefined) qb.andWhere('user.isActive = :isActive', { isActive });
      if (isVerified !== undefined) qb.andWhere('user.isVerified = :isVerified', { isVerified });
      if (provider !== undefined) qb.andWhere('user.provider = :provider', { provider });

      const [data, total] = await qb
        .orderBy('user.createdAt', 'DESC')
        .skip((page - 1) * safeLimit)
        .take(safeLimit)
        .getManyAndCount();

      return ResponseHelper.success({ data, total, page, limit: safeLimit }, 'Users fetched');
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
      if (!user) throw new NotFoundException(`Không tìm thấy user với id ${id}`);

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

      if (updateUserDto.password) {
        updateUserDto.password = await this.hashPassword(updateUserDto.password);
      }

      await this.userRepository.update(id, updateUserDto);
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

  async updateProvider(id: string, provider: AuthProvider, providerId: string): Promise<void> {
    return asyncHandleOperation(async () => {
      await this.userRepository.update(id, { provider, providerId });
    }, 'Lỗi khi cập nhật provider');
  }

  async changePassword(id: string, password: string): Promise<void> {
    return asyncHandleOperation(async () => {
      const passwordHash = await this.hashPassword(password);
      await this.userRepository.update(id, { password: passwordHash });
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
      if (!user) throw new NotFoundException(`Không tìm thấy user với id ${id}`);
      await this.userRepository.update(id, { isActive });
      return { ...user, isActive };
    }, 'Lỗi khi cập nhật trạng thái người dùng');
  }

  async softRemove(id: string, requestingUserId: string) {
    return asyncHandleOperation(async () => {
      if (id === requestingUserId) {
        throw new AppException('Không thể tự xóa tài khoản của mình', HttpStatus.FORBIDDEN);
      }
      const user = await this.userRepository.findOneBy({ id });
      if (!user) throw new NotFoundException(`Không tìm thấy user với id ${id}`);
      await this.userRepository.softDelete(id);
      return ResponseHelper.success(null, 'User deleted');
    }, 'Lỗi khi xóa người dùng');
  }

  async restore(id: string) {
    return asyncHandleOperation(async () => {
      const user = await this.userRepository.findOne({ where: { id }, withDeleted: true });
      if (!user) throw new NotFoundException(`Không tìm thấy user với id ${id}`);
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
      if (!user) throw new NotFoundException(`Không tìm thấy user với id ${id}`);

      const token = this.jwtService.sign(
        { sub: user.id, email: user.email },
        {
          secret: this.configService.get<string>('JWT_RESET_PASSWORD_SECRET'),
          expiresIn: this.configService.get<string>('JWT_RESET_PASSWORD_EXPIRES_IN') as StringValue,
        },
      );

      const resetUrl = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${token}`;
      await this.mailService.sendResetPasswordEmail(user.email, user.fullName, resetUrl);
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

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}
