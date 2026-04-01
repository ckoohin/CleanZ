import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceEntity } from './entities/service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { GetServicesFilterDto } from './dto/get-service-filter.dto';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { 
  normalizeUploadPath, 
  type UploadedImageFile 
} from 'src/common/helpers/upload-image.helper';
import { deleteFile } from 'src/common/helpers/file.helper';
import { PaginatedServiceResponseDto } from './dto/service-response.dto';
import { toServiceResponseDto, toServiceResponseDtoList } from './mapper/service.mapper';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
  ) {}

  async createService(
    dto: CreateServiceDto,
    file: UploadedImageFile | undefined,
    adminId: string,
  ) {
    return asyncHandleOperation(async () => {
      let imagePath: string | null = null;
      if (file) {
        imagePath = normalizeUploadPath(file);
      }

      try {
        const newService = this.serviceRepository.create({
          ...dto,
          imagePath: imagePath,
          createdByAdminId: adminId,
          lastUpdatedByAdminId: adminId,
        });

        const savedService = await this.serviceRepository.save(newService);
        return toServiceResponseDto(savedService);
      } catch (error) {
        if (imagePath) deleteFile(imagePath);
        throw error;
      }
    }, 'Lỗi khi tạo dịch vụ mới');
  }

  async getAllServices(filterDto: GetServicesFilterDto): Promise<PaginatedServiceResponseDto> {
    const { keyword, category, minPrice, maxPrice, page = 1, limit = 10 } = filterDto;

    const query = this.serviceRepository.createQueryBuilder('service');
    query.where('service.isActive = :isActive', { isActive: true });

    if (keyword) {
      query.andWhere('LOWER(service.name) LIKE LOWER(:keyword)', { keyword: `%${keyword}%` });
    }
    if (category) {
      query.andWhere('service.category = :category', { category });
    }
    if (minPrice !== undefined) {
      query.andWhere('service.basePrice >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      query.andWhere('service.basePrice <= :maxPrice', { maxPrice });
    }

    query.orderBy('service.createdAt', 'DESC');
    query.skip((page - 1) * limit).take(limit);

    const [services, total] = await query.getManyAndCount();

    return {
      data: toServiceResponseDtoList(services),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getServiceById(id: string) {
    const service = await this.serviceRepository.findOne({ where: { id, isActive: true } });
    if (!service) {
      throw new NotFoundException('Không tìm thấy dịch vụ hoặc dịch vụ đã bị ẩn');
    }
    return toServiceResponseDto(service);
  }

  async updateService(
    id: string,
    dto: UpdateServiceDto,
    file: UploadedImageFile | undefined,
    adminId: string,
  ) {
    return asyncHandleOperation(async () => {
      const service = await this.serviceRepository.findOne({ where: { id } });
      if (!service) {
        if (file) deleteFile(normalizeUploadPath(file)); 
        throw new NotFoundException('Không tìm thấy dịch vụ');
      }

      let oldImagePath: string | null | undefined = null;
      
      Object.assign(service, dto);
      service.lastUpdatedByAdminId = adminId;

      if (file) {
        oldImagePath = service.imagePath; 
        service.imagePath = normalizeUploadPath(file);
      }

      try {
        const updatedService = await this.serviceRepository.save(service);
        if (oldImagePath) deleteFile(oldImagePath);
        return toServiceResponseDto(updatedService);
      } catch (error) {
        if (file) deleteFile(normalizeUploadPath(file));
        throw error;
      }
    }, 'Lỗi khi cập nhật dịch vụ');
  }

  async removeService(id: string, adminId: string) {
    return asyncHandleOperation(async () => {
      const service = await this.serviceRepository.findOne({ where: { id } });
      if (!service) {
        throw new NotFoundException('Không tìm thấy dịch vụ');
      }

      service.isActive = false;
      service.lastUpdatedByAdminId = adminId;
      await this.serviceRepository.save(service);
      
      return { message: 'Đã ẩn dịch vụ thành công' };
    }, 'Lỗi khi xóa dịch vụ');
  }
}