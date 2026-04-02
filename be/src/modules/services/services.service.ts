import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceEntity } from './entities/service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { GetServicesFilterDto } from './dto/get-service-filter.sto';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { PaginatedServiceResponseDto } from './dto/service-response.dto';
import { toServiceResponseDto, toServiceResponseDtoList } from './mapper/service.mapper';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
    private readonly uploadService: UploadService,
  ) {}

  async createService(
    dto: CreateServiceDto,
    file: Express.Multer.File | undefined, 
    adminId: string,
  ) {
    return asyncHandleOperation(async () => {
      let imageUrl: string | null = null;
      let imagePublicId: string | null = null;

      if (file) {
        const uploadResult = await this.uploadService.uploadImage(file);
        imageUrl = uploadResult.url;
        imagePublicId = uploadResult.public_id;
      }

      try {
        const newService = this.serviceRepository.create({
          ...dto,
          imageUrl: imageUrl,
          imagePublicId: imagePublicId,
          createdByAdminId: adminId,
          lastUpdatedByAdminId: adminId,
        });

        const savedService = await this.serviceRepository.save(newService);
        return toServiceResponseDto(savedService);
      } catch (error) {
        if (imagePublicId) {
          this.uploadService.deleteImage(imagePublicId).catch(err => 
            this.logger.error(`Rollback Cloudinary image failed: ${err.message}`)
          );
        }
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
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
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
    file: Express.Multer.File | undefined,
    adminId: string,
  ) {
    return asyncHandleOperation(async () => {
      const service = await this.serviceRepository.findOne({ where: { id } });
      if (!service) {
        throw new NotFoundException('Không tìm thấy dịch vụ');
      }

      let oldImagePublicId: string | null | undefined = null;
      
      // Merge data text
      Object.assign(service, dto);
      service.lastUpdatedByAdminId = adminId;

      if (file) {
        const uploadResult = await this.uploadService.uploadImage(file);
        
        oldImagePublicId = service.imagePublicId; 
        
        service.imageUrl = uploadResult.url;
        service.imagePublicId = uploadResult.public_id;
      }

      try {
        const updatedService = await this.serviceRepository.save(service);
        
        if (oldImagePublicId) {
          this.uploadService.deleteImage(oldImagePublicId).catch(err => 
            this.logger.error(`Delete old Cloudinary image failed: ${err.message}`)
          );
        }
        return toServiceResponseDto(updatedService);
      } catch (error) {
        if (file && service.imagePublicId && service.imagePublicId !== oldImagePublicId) {
          this.uploadService.deleteImage(service.imagePublicId).catch(err => 
            this.logger.error(`Rollback new Cloudinary image failed: ${err.message}`)
          );
        }
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