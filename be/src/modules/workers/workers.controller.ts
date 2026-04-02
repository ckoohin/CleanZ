import {
  BadRequestException,
  Body,
  Controller,
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
import { WorkersService } from './workers.service';
import { UpdateWorkerProfileDto } from './dto/update-worker-profile.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/AuthRequest';
import {
  FileInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';

const UUIDParam = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException('Người dùng không tồn tại'),
});

@Controller('workers')
@Auth()
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  private static readonly privateImageKeys = [
    { name: 'citizenCardImage', maxCount: 10 }, // Cho phép tối đa 10 file mỗi loại
    { name: 'certificateImage', maxCount: 10 },
  ];

  @Post(':userId/apply')
  async applyToWorker(
    @Param('userId', UUIDParam) userId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.workersService.createProfileWorker(
      userId,
      currentUser.id,
      currentUser.role,
    );
  }
  @Get('/profile')
  async getProfile(@CurrentUser() currentUser: AuthUser) {
    return this.workersService.getProfileWorker(
      currentUser.id,
      currentUser.role,
    );
  }
  @Patch(':id')
  async update(
    @Param('id', UUIDParam) id: string,
    @Body() dto: UpdateWorkerProfileDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.workersService.update(
      id,
      dto,
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
    return this.workersService.updateAvatar(
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
        { name: 'citizenCardImage', maxCount: 2 },
        { name: 'certificateImage', maxCount: 10 },
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
      citizenCardImage?: Express.Multer.File[];
      certificateImage?: Express.Multer.File[];
    },
    @CurrentUser() currentUser: AuthUser,
  ) {
    if (files.citizenCardImage && files.citizenCardImage.length > 2) {
      throw new BadRequestException('Chỉ được upload tối đa 2 ảnh CCCD');
    }
    return this.workersService.updateDocuments(
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
    const filePaths = await this.workersService.getDocumentPaths(
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
    return this.workersService.getAllWorkerDocuments(
      id,
      currentUser.id,
      currentUser.role,
    );
  }
  @Patch(':id/approve')
  @AdminOnly()
  async approveWorker(
    @Param('id', UUIDParam) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    console.log('Admin', currentUser);
    return this.workersService.approveWorker(id, currentUser.id);
  }
  @Patch(':id/reject')
  @AdminOnly()
  async rejectWorker(
    @Param('id', UUIDParam) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.workersService.rejectWorker(id, currentUser.id);
  }
}
