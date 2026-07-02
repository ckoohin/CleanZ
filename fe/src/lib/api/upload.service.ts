import http from '@/lib/api/http';
import { ApiResponse } from '@/features/admin/modules/service/services/admin-services.service';

export type UploadImageResult = {
  url: string;
  public_id: string;
};

type UploadImageOptions = {
  folder?: string;
};

const createImageFormData = (file: File, options?: UploadImageOptions) => {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.folder) formData.append('folder', options.folder);
  return formData;
};

export const uploadApi = {
  uploadImageResult: async (file: File, options?: UploadImageOptions): Promise<UploadImageResult> => {
    const { data } = await http.post<ApiResponse<UploadImageResult>>('/upload/image', createImageFormData(file, options), {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return data.data;
  },

  uploadImage: async (file: File, options?: UploadImageOptions): Promise<string> => {
    const result = await uploadApi.uploadImageResult(file, options);
    return result.url;
  },

  deleteImage: async (publicId: string): Promise<boolean> => {
    const { data } = await http.delete<ApiResponse<boolean>>('/upload/image', {
      data: { public_id: publicId },
      params: { public_id: publicId },
    });
    return data.success;
  },
};
