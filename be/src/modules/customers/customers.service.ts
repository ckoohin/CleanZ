import { toCustomerProfileResponseDto } from './mapper/customer.mapper';

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerEntity } from './entities/customer.entity';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import { normalizeUploadPath, UploadedImageFile } from 'src/common/helpers/upload-image.helper';
import { assertCanUpdate, deleteFile, deleteFiles } from 'src/common/helpers/file.helper';
import { asyncHandleOperation } from 'src/utils/async-handle';
import { CustomerProfileResponseDto } from './dto/customer-profile.response';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,

  ) { }

  async getOrCreateProfile(userId: string) {
    let profile = await this.customerRepository.findOne({ where: { user: { id: userId } }, relations: ['user'] });
    if (!profile) {
      profile = this.customerRepository.create({ user: { id: userId } });
      profile = await this.customerRepository.save(profile);
    }
    return toCustomerProfileResponseDto(profile);
  }

  async findOneByUserId(userId: string, requestUserId: string, requestUserRole: UserRole) {
    const profile = await this.customerRepository.findOne({ where: { user: { id: userId } }, relations: ['user'] });
    if (!profile) throw new NotFoundException('Không tìm thấy profile customer');
    if (requestUserRole !== UserRole.ADMIN && userId !== requestUserId) {
      throw new ForbiddenException('Bạn không có quyền truy cập profile này');
    }
    return toCustomerProfileResponseDto(profile);
  }

  async updateProfile(userId: string, dto: UpdateCustomerDto, requestUserId: string, requestUserRole: UserRole) {
    const profile = await this.customerRepository.findOne({ where: { user: { id: userId } }, relations: ['user'] });
    if (!profile) throw new NotFoundException('Không tìm thấy profile customer');
    if (requestUserRole !== UserRole.ADMIN && userId !== requestUserId) {
      throw new ForbiddenException('Bạn không có quyền cập nhật profile này');
    }
    Object.assign(profile, dto);
    const updated = await this.customerRepository.save(profile);
    return toCustomerProfileResponseDto(updated);
  }
}
