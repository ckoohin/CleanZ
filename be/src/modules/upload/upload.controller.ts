import {
  Controller,
  Post,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadService } from './upload.service';
import { ResponseHelper } from '../../common/helpers/response.helper';
import { AppException } from '../../common/exceptions/app.exception';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

const MAX_FILE_SIZE = 5 * 1024 * 1024; //5MB

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),

      limits: { fileSize: MAX_FILE_SIZE },

      // Validate MIME type ngay tại tầng Multer
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return callback(
            new AppException(
              `Invalid file type. Only jpg, jpeg, png are allowed. Received: ${file.mimetype}`,
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new AppException('No file uploaded. Field name must be "file".');
    }

    const result = await this.uploadService.uploadImage(file);

    return ResponseHelper.success(result, 'Image uploaded successfully');
  }

  @Delete('image/*publicId')
  @HttpCode(HttpStatus.OK)
  async deleteImage(@Param('publicId') publicId: string) {
    publicId = publicId.replace(/,/g, '/');

    publicId = publicId.replace(/^\/+/, '');

    if (!publicId.trim()) {
      throw new AppException('publicId is required.');
    }

    const result = await this.uploadService.deleteImage(publicId);

    return ResponseHelper.success(result, 'Image deleted successfully');
  }
}
