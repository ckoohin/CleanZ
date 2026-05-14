/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { StaffsService } from './staffs.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/AuthRequest';
import {
  FileInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { UpdateStaffPresenceDto } from './dto/update-staff-presence.dto';
import { UpdateStaffProfileDto } from './dto/update-staff-profile.dto';
import { CreateStaffServiceDto } from './dto/create-staff-service.dto';
import { UpdateStaffServiceDto } from './dto/update-staff-service.dto';

const UUIDParam = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException('Người dùng không tồn tại'),
});

@Controller('staffs')
@Auth()
export class StaffsController {
  constructor(private readonly staffsService: StaffsService) {}

  @Get('/profile')
  async getProfile(@CurrentUser() currentUser: AuthUser) {
    return this.staffsService.getProfileStaff(currentUser.id, currentUser.role);
  }

  @Get('presence/me')
  async getMyPresence(@CurrentUser() currentUser: AuthUser) {
    return this.staffsService.getMyPresence(currentUser.id, currentUser.role);
  }

  @Patch('presence/me')
  async updateMyPresence(
    @Body() dto: UpdateStaffPresenceDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.staffsService.updateMyPresence(
      currentUser.id,
      currentUser.role,
      dto,
    );
  }

  @Post(':userId/apply')
  async applyToStaff(
    @Param('userId', UUIDParam) userId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.staffsService.createProfileStaff(
      userId,
      currentUser.id,
      currentUser.role,
    );
  }

  @Patch(':id/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new Error('Chỉ chấp nhận file ảnh'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async updateAvatar(
    @Param('id', UUIDParam) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: AuthUser,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn ảnh đại diện');
    }
    return this.staffsService.updateAvatar(
      id,
      file,
      currentUser.id,
      currentUser.role,
    );
  }

  @Patch(':id/documents')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'citizenCard', maxCount: 2 },
        { name: 'certificate', maxCount: 10 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
          if (!file.mimetype.startsWith('image/')) {
            cb(new Error('Chỉ chấp nhận file ảnh'), false);
            return;
          }
          cb(null, true);
        },
      },
    ),
  )
  async updateDocuments(
    @Param('id', UUIDParam) id: string,
    @UploadedFiles()
    files: {
      citizenCard?: Express.Multer.File[];
      certificate?: Express.Multer.File[];
    },
    @CurrentUser() currentUser: AuthUser,
  ) {
    const citizenCardCount = files?.citizenCard?.length ?? 0;
    const certificateCount = files?.certificate?.length ?? 0;

    if (citizenCardCount > 2) {
      throw new BadRequestException('Chỉ được upload tối đa 2 ảnh CCCD');
    }
    if (certificateCount > 10) {
      throw new BadRequestException('Chỉ được upload tối đa 10 ảnh chứng chỉ');
    }

    return this.staffsService.updateDocuments(
      id,
      files,
      currentUser.id,
      currentUser.role,
    );
  }

  @Get(':id/documents/:type')
  async getDocumentByType(
    @Param('id', UUIDParam) id: string,
    @Param('type') type: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    const filePaths = await this.staffsService.getDocumentPaths(
      id,
      type,
      currentUser.id,
      currentUser.role,
    );
    return { files: filePaths };
  }

  @Get(':id/documents')
  async getAllDocuments(
    @Param('id', UUIDParam) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.staffsService.getAllStaffDocuments(
      id,
      currentUser.id,
      currentUser.role,
    );
  }

  @Patch(':id/approve')
  @AdminOnly()
  async approveStaff(
    @Param('id', UUIDParam) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.staffsService.approveStaff(id, currentUser.id);
  }

  @Patch(':id/reject')
  @AdminOnly()
  async rejectStaff(
    @Param('id', UUIDParam) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.staffsService.rejectStaff(id, currentUser.id);
  }

  @Patch(':id')
  async update(
    @Param('id', UUIDParam) id: string,
    @Body() dto: UpdateStaffProfileDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.staffsService.update(id, dto, currentUser.id, currentUser.role);
  }

  // ─── Staff Services Endpoints ──────────────────────────

  @Post(':id/services')
  createStaffService(
    @Param('id', UUIDParam) id: string,
    @Body() dto: CreateStaffServiceDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.staffsService.createStaffService(
      id,
      dto,
      currentUser.id,
      currentUser.role,
    );
  }

  @Get(':id')
  async findById(
    @Param('id', UUIDParam) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.staffsService.findStaffById(
      id,
      currentUser.id,
      currentUser.role,
    );
  }

  @Get(':id/services')
  async getStaffServices(@Param('id', UUIDParam) id: string) {
    return this.staffsService.getStaffServices(id);
  }

  @Patch(':id/services/:wsId')
  async updateStaffService(
    @Param('id', UUIDParam) id: string,
    @Param('wsId', UUIDParam) wsId: string,
    @Body() dto: UpdateStaffServiceDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.staffsService.updateStaffService(
      id,
      wsId,
      dto,
      currentUser.id,
      currentUser.role,
    );
  }

  @Delete(':id/services/:wsId')
  async deleteStaffService(
    @Param('id', UUIDParam) id: string,
    @Param('wsId', UUIDParam) wsId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.staffsService.deleteStaffService(
      id,
      wsId,
      currentUser.id,
      currentUser.role,
    );
  }
}
