import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query, 
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { GetServicesFilterDto } from './dto/get-service-filter.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/AuthRequest';
import { 
  createSingleImageInterceptor, 
  type UploadedImageFile 
} from 'src/common/helpers/upload-image.helper';

@Controller('services')
@Auth() 
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @AdminOnly()
  @UseInterceptors(createSingleImageInterceptor('image', 'public/services'))
  async create(
    @Body() createServiceDto: CreateServiceDto,
    @UploadedFile() file: UploadedImageFile,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.servicesService.createService(createServiceDto, file, currentUser.id);
  }

  @Get()
  async findAll(@Query() filterDto: GetServicesFilterDto) {
    return this.servicesService.getAllServices(filterDto);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.getServiceById(id);
  }

  @Patch(':id')
  @AdminOnly()
  @UseInterceptors(createSingleImageInterceptor('image', 'public/services'))
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateServiceDto: UpdateServiceDto,
    @UploadedFile() file: UploadedImageFile,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.servicesService.updateService(id, updateServiceDto, file, currentUser.id);
  }

  @Delete(':id')
  @AdminOnly()
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.servicesService.removeService(id, currentUser.id);
  }
}