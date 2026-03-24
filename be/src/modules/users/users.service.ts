import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    return asyncHandleOperation(async () => {
      const existingUser = await this.userRepository.findOne({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new ConflictException('Username đã tồn tại');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(dto.password, 10);

      const user = this.userRepository.create({
        ...dto,
        password: hashedPassword,
      });

      const savedUser = await this.userRepository.save(user);

      // Loại bỏ password khỏi response
      const { password: _password, ...result } = savedUser;
      return result;
    }, 'Lỗi khi tạo người dùng');
  }

  async findAll(): Promise<UserResponseDto[]> {
    return asyncHandleOperation(async () => {
      const users = await this.userRepository.find();
      return users.map(({ password, ...user }) => user);
    }, 'Lỗi khi lấy Users');
  }

  async findOne(id: string): Promise<UserResponseDto> {
    return asyncHandleOperation(async () => {
      const user = await this.userRepository.findOneBy({ id });
      if (!user) {
        throw new NotFoundException(`Không tìm thấy user với id ${id}`);
      }
      const { password, ...result } = user;
      return result;
    }, 'Lỗi khi lấy một người dùng');
  }

  async findByUsername(username: string): Promise<User | null> {
    return asyncHandleOperation(() => {
      return this.userRepository
        .createQueryBuilder('user')
        .where('user.username = :username', { username })
        .addSelect('user.password')
        .getOne();
    }, 'Lỗi khi tìm người dùng theo tên đăng nhập');
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return asyncHandleOperation(async () => {
      const user = await this.userRepository.findOneBy({ id });
      if (!user) {
        throw new NotFoundException(`Không tìm thấy user với id ${id}`);
      }

      // Nếu cập nhật password, hash lại
      if (updateUserDto.password) {
        updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
      }

      await this.userRepository.update(id, updateUserDto);
      const updatedUser = await this.userRepository.findOneBy({ id });
      if (!updatedUser) {
        throw new NotFoundException(`Không tìm thấy user với id ${id}`);
      }
      const { password, ...result } = updatedUser;
      return result;
    }, 'Lỗi khi cập nhật người dùng');
  }

  async updateLastLogin(id: string): Promise<void> {
    return asyncHandleOperation(async () => {
      await this.userRepository.update(id, { lastLogin: new Date() });
    }, 'Lỗi khi cập nhật thời gian đăng nhập');
  }

  async remove(id: string): Promise<UserResponseDto> {
    return asyncHandleOperation(async () => {
      const user = await this.userRepository.findOneBy({ id });

      if (!user) {
        throw new NotFoundException(`Không tìm thấy user với id ${id}`);
      }

      await this.userRepository.delete(id);

      const { password, ...result } = user;
      return result;
    }, 'Lỗi khi xóa người dùng');
  }
}
