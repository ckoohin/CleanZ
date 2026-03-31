import { BadRequestException, Type } from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';

const DEFAULT_UPLOAD_ROOT = 'uploads';
const DEFAULT_MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export interface UploadedImageFile {
    path: string;
}

export interface ImageFieldConfig {
    name: string;
    maxCount?: number;
}

function createUploadDestination(folder: string): string {
    const uploadDir = join(DEFAULT_UPLOAD_ROOT, folder);
    mkdirSync(uploadDir, { recursive: true });
    return uploadDir;
}

export function createImageMulterOptions(
    folder: string,
    maxFileSize = DEFAULT_MAX_IMAGE_SIZE,
): MulterOptions {
    return {
        storage: diskStorage({
            destination: (_req, _file, cb) => {
                cb(null, createUploadDestination(folder));
            },
            filename: (_req, file, cb) => {
                cb(null, `${randomUUID()}${extname(file.originalname)}`);
            },
        }),
        fileFilter: (_req, file, cb) => {
            if (!file.mimetype.startsWith('image/')) {
                cb(new BadRequestException('Chỉ chấp nhận file ảnh') as never, false);
                return;
            }
            cb(null, true);
        },
        limits: { fileSize: maxFileSize },
    };
}

export function createSingleImageInterceptor(
    fieldName: string,
    folder: string,
    maxFileSize = DEFAULT_MAX_IMAGE_SIZE,
): Type<any> {
    return FileInterceptor(
        fieldName,
        createImageMulterOptions(folder, maxFileSize),
    ) as unknown as Type<any>;
}

export function createMultiImageInterceptor(
    fields: ImageFieldConfig[],
    folder: string,
    maxFileSize = DEFAULT_MAX_IMAGE_SIZE,
): Type<any> {
    const normalizedFields = fields.map((field) => ({
        name: field.name,
        maxCount: field.maxCount ?? 1,
    }));

    return FileFieldsInterceptor(
        normalizedFields,
        createImageMulterOptions(folder, maxFileSize),
    ) as unknown as Type<any>;
}

export function normalizeUploadPath(file?: UploadedImageFile): string | null {
    if (!file?.path) {
        return null;
    }

    return file.path.replace(/\\/g, '/');
}
