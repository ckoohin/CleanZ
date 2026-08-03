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

  /**
   * `authenticated: true` → file KHÔNG tải được bằng URL trần; mỗi lần giao phải có chữ ký
   * của server (xem `signedUrl`). Dùng cho ảnh mà quyền xem phụ thuộc vai trò người dùng —
   * bằng chứng sự cố, minh chứng chuyển khoản — chứ không phải ảnh công khai như avatar.
   */
  async uploadImage(
    file: Express.Multer.File,
    folder = UPLOAD_FOLDER,
    options: { authenticated?: boolean } = {},
  ): Promise<UploadResult> {
    return asyncHandleOperation(async () => {
      const result = await this.uploadToCloudinary(
        file.buffer,
        folder,
        options.authenticated === true,
      );

      // Không log URL/public_id vì upload có thể là giấy tờ KYC nhạy cảm.
      this.logger.log('Upload success');

      return {
        url: result.secure_url,
        public_id: result.public_id,
      };
    }, 'Failed to upload image to Cloudinary');
  }

  /**
   * URL giao hàng CÓ CHỮ KÝ cho tài sản `authenticated`. Chỉ gọi sau khi đã xác định người
   * xem được phép thấy tài sản này — chính lời gọi hàm này là hành vi cấp quyền.
   *
   * Chữ ký gắn với secret của tài khoản Cloudinary nên URL trần (hoặc URL cũ bị rò rỉ) vô
   * dụng. URL đã ký thì chưa có hạn dùng: hạn theo thời gian cần `auth_token` của Cloudinary
   * (gói trả phí). Khi bật được, chỉ cần sửa đúng hàm này.
   */
  signedUrl(publicId: string): string {
    return cloudinary.url(publicId, {
      type: 'authenticated',
      resource_type: 'image',
      sign_url: true,
      secure: true,
    });
  }

  async deleteImage(
    publicId: string,
    options: { authenticated?: boolean } = {},
  ): Promise<{ message: string }> {
    return asyncHandleOperation(async () => {
      const result = (await cloudinary.uploader.destroy(publicId, {
        type: options.authenticated === true ? 'authenticated' : 'upload',
      })) as CloudinaryDestroyResponse;

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

  /**
   * Xoá file cho các tác vụ DỌN DẸP: coi "không tìm thấy" là thành công.
   *
   * `deleteImage` ném lỗi khi file đã biến mất — đúng cho thao tác người dùng chủ động xoá,
   * nhưng sai cho vòng quét dọn rác: file đã mất mà bản ghi DB không xoá được thì rác nằm
   * lại vĩnh viễn và vòng quét sau lại thử lại đúng file đó.
   */
  async destroyQuietly(
    publicId: string,
    options: { authenticated?: boolean } = {},
  ): Promise<boolean> {
    try {
      const result = (await cloudinary.uploader.destroy(publicId, {
        type: options.authenticated === true ? 'authenticated' : 'upload',
      })) as CloudinaryDestroyResponse;
      return result.result === 'ok' || result.result === 'not found';
    } catch (e) {
      this.logger.warn(`Cleanup destroy failed: ${String(e)}`);
      return false;
    }
  }

  private uploadToCloudinary(
    buffer: Buffer,
    folder: string,
    authenticated = false,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          quality: 'auto',
          fetch_format: 'auto',
          timeout: CLOUDINARY_UPLOAD_TIMEOUT_MS,
          ...(authenticated ? { type: 'authenticated' } : {}),
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
