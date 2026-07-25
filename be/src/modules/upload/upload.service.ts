import { Injectable, Logger } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import * as streamifier from 'streamifier';
import { AppException } from '../../common/exceptions/app.exception';
import { asyncHandleOperation } from '../../common/utils/async-handle.utils';

const UPLOAD_FOLDER = 'CleanZ/uploads';
const CLOUDINARY_UPLOAD_TIMEOUT_MS = 120_000;

export interface UploadResult {
  url: string;
  public_id: string;
}

type CloudinaryDestroyResponse = {
  result: 'ok' | 'not found';
};

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  async uploadImage(
    file: Express.Multer.File,
    folder = UPLOAD_FOLDER,
  ): Promise<UploadResult> {
    return asyncHandleOperation(async () => {
      const result = await this.uploadToCloudinary(file.buffer, folder);

      // Không log URL/public_id vì upload có thể là giấy tờ KYC nhạy cảm.
      this.logger.log('Upload success');

      return {
        url: result.secure_url,
        public_id: result.public_id,
      };
    }, 'Failed to upload image to Cloudinary');
  }

  async deleteImage(publicId: string): Promise<{ message: string }> {
    return asyncHandleOperation(async () => {
      const result = (await cloudinary.uploader.destroy(
        publicId,
      )) as CloudinaryDestroyResponse;

      if (result.result !== 'ok') {
        throw new AppException(
          `Image not found or already deleted: ${publicId}`,
          404,
        );
      }

      this.logger.log('Delete success');

      return { message: 'Image deleted successfully' };
    }, 'Failed to delete image from Cloudinary');
  }

  private uploadToCloudinary(
    buffer: Buffer,
    folder: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          quality: 'auto',
          fetch_format: 'auto',
          timeout: CLOUDINARY_UPLOAD_TIMEOUT_MS,
        },
        (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
          if (error) {
            this.logger.error('Cloudinary stream error', error);
            return reject(new Error(error.message));
          }
          if (!result) {
            return reject(new Error('Upload failed: no result returned'));
          }
          resolve(result);
        },
      );
      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  }
}
