import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { isHanoiAddress } from 'src/common/utils/hanoi-address.utils';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { UploadService } from '../upload/upload.service';
import { UserEntity } from '../users/entities/user.entity';
import { CustomerAddressEntity } from './entity/customer-address.entity';
import { CustomerEntity } from './entity/customer.entity';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { UpsertCustomerAddressDto } from './dto/upsert-customer-address.dto';
import { UpdateCustomerAddressDto } from './dto/update-customer-address.dto';

export interface CustomerProfileResponse {
  id: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    phone?: string | null;
    avatarUrl?: string | null;
  };
  defaultPaymentMethod: string;
  totalBookings: number;
  totalCancelled: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerLookupResponse {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  addresses: {
    id: string;
    label: string | null;
    fullAddress: string;
    isDefault: boolean;
    hasPet: boolean;
  }[];
}

export interface CustomerAddressResponse {
  id: string;
  label?: string | null;
  fullAddress: string;
  wardDetail?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
  hasPet: boolean;
  contactName?: string | null;
  contactPhone?: string | null;
  buildingFloor?: string | null;
  gate?: string | null;
  driverNote?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CustomerService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly uploadService: UploadService,
  ) {}

  async createProfileIfNotExists(
    manager: EntityManager,
    user: UserEntity,
  ): Promise<CustomerEntity> {
    const customerRepository = manager.getRepository(CustomerEntity);
    const existingCustomer = await customerRepository.findOne({
      where: { user: { id: user.id } },
    });

    if (existingCustomer) {
      return existingCustomer;
    }

    return customerRepository.save(
      customerRepository.create({
        user,
      }),
    );
  }

  async getMyProfile(userId: string): Promise<CustomerProfileResponse> {
    return asyncHandleOperation(async () => {
      const customer = await this.findCustomerByUserId(userId);

      return this.mapProfile(customer);
    }, 'Không thể lấy hồ sơ customer');
  }

  async updateMyProfile(
    userId: string,
    dto: UpdateCustomerProfileDto,
    avatar?: Express.Multer.File,
  ): Promise<CustomerProfileResponse> {
    return asyncHandleOperation(async () => {
      const customer = await this.findCustomerByUserId(userId);
      const user = customer.user;
      const avatarUpload = avatar
        ? await this.uploadService.uploadImage(avatar)
        : null;

      if (dto.fullName !== undefined) {
        user.fullName = dto.fullName.trim();
      }
      if (dto.phone !== undefined) {
        user.phone = dto.phone.trim();
      }
      if (avatarUpload) {
        user.avatarUrl = avatarUpload.url;
      }

      await this.dataSource.getRepository(UserEntity).save(user);
      const updatedCustomer = await this.findCustomerByUserId(userId);

      return this.mapProfile(updatedCustomer);
    }, 'Không thể cập nhật hồ sơ customer');
  }

  async findMyAddresses(userId: string): Promise<CustomerAddressResponse[]> {
    return asyncHandleOperation(async () => {
      const customer = await this.findCustomerByUserId(userId);
      const addresses = await this.dataSource
        .getRepository(CustomerAddressEntity)
        .find({
          where: { customer: { id: customer.id } },
          order: { isDefault: 'DESC', createdAt: 'DESC' },
        });

      return addresses
        .filter((address) =>
          isHanoiAddress(address.fullAddress, address.wardDetail),
        )
        .map((address) => this.mapAddress(address));
    }, 'Không thể lấy danh sách địa chỉ customer');
  }

  async createMyAddress(
    userId: string,
    dto: UpsertCustomerAddressDto,
  ): Promise<CustomerAddressResponse> {
    return asyncHandleOperation(async () => {
      return this.dataSource.transaction(async (manager) => {
        const customer = await this.findCustomerByUserId(userId, manager);
        const addressRepository = manager.getRepository(CustomerAddressEntity);
        this.assertHanoiAddress(dto.fullAddress, dto.wardDetail);
        const existingAddresses = await addressRepository.find({
          where: { customer: { id: customer.id } },
          select: {
            fullAddress: true,
            wardDetail: true,
          },
        });
        const shouldSetDefault =
          dto.isDefault === true ||
          !existingAddresses.some((address) =>
            isHanoiAddress(address.fullAddress, address.wardDetail),
          );

        if (shouldSetDefault) {
          await this.clearDefaultAddresses(manager, customer.id);
        }

        const address = addressRepository.create({
          customer,
          label: dto.label?.trim() || null,
          fullAddress: dto.fullAddress.trim(),
          wardDetail: dto.wardDetail?.trim() || null,
          latitude: dto.latitude ?? null,
          longitude: dto.longitude ?? null,
          isDefault: shouldSetDefault,
          hasPet: dto.hasPet ?? false,
          contactName: dto.contactName?.trim() || null,
          contactPhone: dto.contactPhone?.trim() || null,
          buildingFloor: dto.buildingFloor?.trim() || null,
          gate: dto.gate?.trim() || null,
          driverNote: dto.driverNote?.trim() || null,
        });

        return this.mapAddress(await addressRepository.save(address));
      });
    }, 'Không thể tạo địa chỉ customer');
  }

  async updateMyAddress(
    userId: string,
    addressId: string,
    dto: UpdateCustomerAddressDto,
  ): Promise<CustomerAddressResponse> {
    return asyncHandleOperation(async () => {
      return this.dataSource.transaction(async (manager) => {
        const customer = await this.findCustomerByUserId(userId, manager);
        const addressRepository = manager.getRepository(CustomerAddressEntity);
        const address = await addressRepository.findOne({
          where: { id: addressId, customer: { id: customer.id } },
        });

        if (!address) {
          throw new NotFoundException(
            'Địa chỉ không tồn tại hoặc không thuộc customer',
          );
        }

        const nextFullAddress = dto.fullAddress?.trim() ?? address.fullAddress;
        const nextWardDetail =
          dto.wardDetail !== undefined
            ? dto.wardDetail?.trim() || null
            : address.wardDetail;
        this.assertHanoiAddress(nextFullAddress, nextWardDetail);

        if (dto.isDefault === true && !address.isDefault) {
          await this.clearDefaultAddresses(manager, customer.id);
          address.isDefault = true;
        } else if (dto.isDefault !== undefined) {
          address.isDefault = dto.isDefault;
        }

        if (dto.label !== undefined) {
          address.label = dto.label?.trim() || null;
        }
        if (dto.fullAddress !== undefined) {
          address.fullAddress = dto.fullAddress.trim();
        }
        if (dto.wardDetail !== undefined) {
          address.wardDetail = dto.wardDetail?.trim() || null;
        }
        if (dto.latitude !== undefined) {
          address.latitude = dto.latitude;
        }
        if (dto.longitude !== undefined) {
          address.longitude = dto.longitude;
        }
        if (dto.hasPet !== undefined) {
          address.hasPet = dto.hasPet;
        }
        if (dto.contactName !== undefined) {
          address.contactName = dto.contactName?.trim() || null;
        }
        if (dto.contactPhone !== undefined) {
          address.contactPhone = dto.contactPhone?.trim() || null;
        }
        if (dto.buildingFloor !== undefined) {
          address.buildingFloor = dto.buildingFloor?.trim() || null;
        }
        if (dto.gate !== undefined) {
          address.gate = dto.gate?.trim() || null;
        }
        if (dto.driverNote !== undefined) {
          address.driverNote = dto.driverNote?.trim() || null;
        }

        return this.mapAddress(await addressRepository.save(address));
      });
    }, 'Không thể cập nhật địa chỉ customer');
  }

  async setMyDefaultAddress(
    userId: string,
    addressId: string,
  ): Promise<CustomerAddressResponse> {
    return asyncHandleOperation(async () => {
      return this.dataSource.transaction(async (manager) => {
        const customer = await this.findCustomerByUserId(userId, manager);
        const addressRepository = manager.getRepository(CustomerAddressEntity);
        const address = await addressRepository.findOne({
          where: { id: addressId, customer: { id: customer.id } },
        });

        if (!address) {
          throw new NotFoundException(
            'Địa chỉ không tồn tại hoặc không thuộc customer',
          );
        }

        this.assertHanoiAddress(address.fullAddress, address.wardDetail);

        if (!address.isDefault) {
          await this.clearDefaultAddresses(manager, customer.id);
          address.isDefault = true;
          await addressRepository.save(address);
        }

        return this.mapAddress(address);
      });
    }, 'Không thể đặt địa chỉ mặc định');
  }

  private async findCustomerByUserId(
    userId: string,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<CustomerEntity> {
    const customer = await manager.getRepository(CustomerEntity).findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!customer) {
      throw new NotFoundException('Không tìm thấy hồ sơ customer');
    }

    return customer;
  }

  private clearDefaultAddresses(
    manager: EntityManager,
    customerId: string,
  ): Promise<unknown> {
    return manager
      .getRepository(CustomerAddressEntity)
      .createQueryBuilder()
      .update(CustomerAddressEntity)
      .set({ isDefault: false })
      .where('customer_id = :customerId', { customerId })
      .execute();
  }

  private assertHanoiAddress(
    fullAddress: string,
    wardDetail?: string | null,
  ): void {
    if (!isHanoiAddress(fullAddress, wardDetail)) {
      throw new BadRequestException(
        'Hiện hệ thống chỉ hỗ trợ địa chỉ tại Hà Nội',
      );
    }
  }

  private mapProfile(customer: CustomerEntity): CustomerProfileResponse {
    return {
      id: customer.id,
      user: {
        id: customer.user.id,
        email: customer.user.email,
        fullName: customer.user.fullName,
        phone: customer.user.phone ?? null,
        avatarUrl: customer.user.avatarUrl ?? null,
      },
      defaultPaymentMethod: customer.defaultPaymentMethod,
      totalBookings: customer.totalBookings,
      totalCancelled: customer.totalCancelled,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }

  async lookupByPhone(phone: string): Promise<CustomerLookupResponse> {
    return asyncHandleOperation(async () => {
      const user = await this.dataSource.getRepository(UserEntity).findOne({
        where: { phone },
      });

      if (!user) {
        throw new NotFoundException(
          'Không tìm thấy khách hàng với số điện thoại này',
        );
      }

      if (!user.isActive) {
        throw new NotFoundException('Tài khoản khách hàng không còn hoạt động');
      }

      const customer = await this.dataSource
        .getRepository(CustomerEntity)
        .findOne({ where: { user: { id: user.id } } });

      if (!customer) {
        throw new NotFoundException('Không tìm thấy hồ sơ khách hàng');
      }

      const addresses = await this.dataSource
        .getRepository(CustomerAddressEntity)
        .find({
          where: { customer: { id: customer.id } },
          order: { isDefault: 'DESC', createdAt: 'ASC' },
        });

      return {
        id: customer.id,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl ?? null,
        addresses: addresses.map((a) => ({
          id: a.id,
          label: a.label ?? null,
          fullAddress: a.fullAddress,
          isDefault: a.isDefault,
          hasPet: a.hasPet,
        })),
      };
    }, 'Không thể tra cứu khách hàng');
  }

  private mapAddress(address: CustomerAddressEntity): CustomerAddressResponse {
    return {
      id: address.id,
      label: address.label ?? null,
      fullAddress: address.fullAddress,
      wardDetail: address.wardDetail ?? null,
      latitude: address.latitude ?? null,
      longitude: address.longitude ?? null,
      isDefault: address.isDefault,
      hasPet: address.hasPet,
      contactName: address.contactName ?? null,
      contactPhone: address.contactPhone ?? null,
      buildingFloor: address.buildingFloor ?? null,
      gate: address.gate ?? null,
      driverNote: address.driverNote ?? null,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }
}
