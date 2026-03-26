import {
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Res,
    UploadedFile,
    UploadedFiles,
    UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import { WorkersService } from './workers.service';
import { UpdateWorkerProfileDto } from './dto/update-worker-profile.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/AuthRequest';
import {
    createMultiImageInterceptor,
    createSingleImageInterceptor,
    type UploadedImageFile,
} from 'src/common/helpers/upload-image.helper';

const UUIDParam = new ParseUUIDPipe({
    exceptionFactory: () => new NotFoundException('Người dùng không tồn tại'),
});

@Controller('workers')
@Auth()
export class WorkersController {
    constructor(private readonly workersService: WorkersService) { }

    private static readonly privateImageKeys = [
        { name: 'citizenCardImage', maxCount: 1 },
        { name: 'certificateImage', maxCount: 1 },
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

    @Patch(':id')
    async update(
        @Param('id', UUIDParam) id: string,
        @Body() dto: UpdateWorkerProfileDto,
        @CurrentUser() currentUser: AuthUser,
    ) {
        return this.workersService.update(id, dto, currentUser.id, currentUser.role);
    }

    @Patch(':id/avatar')
    @UseInterceptors(
        createSingleImageInterceptor('avatarPath', 'public/avatars'),
    )
    async updateAvatar(
        @Param('id', UUIDParam) id: string,
        @UploadedFile() file: UploadedImageFile,
        @CurrentUser() currentUser: AuthUser,
    ) {
        return this.workersService.updateAvatar(id, file, currentUser.id, currentUser.role);
    }

    @Patch(':id/documents')
    @UseInterceptors(
        createMultiImageInterceptor(
            WorkersController.privateImageKeys,
            'private/workers',
        ),
    )
    async updateDocuments(
        @Param('id', UUIDParam) id: string,
        @UploadedFiles()
        files: {
            citizenCardImage?: UploadedImageFile[];
            certificateImage?: UploadedImageFile[];
        },
        @CurrentUser() currentUser: AuthUser,
    ) {
        return this.workersService.updateDocuments(id, files, currentUser.id, currentUser.role);
    }

    @Get(':id/documents/:type')
    async getDocument(
        @Param('id', UUIDParam) id: string,
        @Param('type') type: string,
        @CurrentUser() currentUser: AuthUser,
        @Res() res: Response,
    ) {
        const filePath = await this.workersService.getDocumentPath(
            id,
            type,
            currentUser.id,
            currentUser.role,
        );

        const absolutePath = join(process.cwd(), filePath);
        if (!existsSync(absolutePath)) {
            throw new NotFoundException('File không tồn tại');
        }

        return res.sendFile(absolutePath);
    }
}
