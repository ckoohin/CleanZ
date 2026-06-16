import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { AuthProvider } from 'src/common/enums/auth-provider.enum';
import { CreateOAuthUserDto } from './dto/create-oauth-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
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

  async findAll(): Promise<UserEntity[]> {
    return asyncHandleOperation(async () => {
      return await this.userRepository.find();
    }, 'Lỗi khi lấy Users');
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
        updateUserDto.password = await this.hashPassword(
          updateUserDto.password,
        );
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

  async updateProvider(
    id: string,
    provider: AuthProvider,
    providerId: string,
  ): Promise<void> {
    return asyncHandleOperation(async () => {
      await this.userRepository.update(id, { provider, providerId });
    }, 'Lỗi khi cập nhật provider');
  }

  public async changePassword(id: string, password: string): Promise<void> {
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
  ): Promise<UserEntity> {
    return asyncHandleOperation(async () => {
      const user = await this.userRepository.findOneBy({ id });
      if (!user) {
        throw new NotFoundException(`Không tìm thấy user với id ${id}`);
      }
      await this.userRepository.update(id, { isActive });
      return { ...user, isActive };
    }, 'Lỗi khi cập nhật trạng thái người dùng');
  }

  async remove(id: string): Promise<UserEntity> {
    return asyncHandleOperation(async () => {
      const user = await this.userRepository.findOneBy({ id });

      if (!user) {
        throw new NotFoundException(`Không tìm thấy user với id ${id}`);
      }

      await this.userRepository.delete(id);

      return user;
    }, 'Lỗi khi xóa người dùng');
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
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
}
