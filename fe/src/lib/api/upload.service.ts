import http from '@/lib/api/http';
import { ApiResponse } from '@/features/admin/modules/service/services/admin-services.service';

export const uploadApi = {
  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await http.post<ApiResponse<{ url: string; public_id: string }>>('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return data.data.url; // URL trả về
  },
  
  deleteImage: async (publicId: string): Promise<boolean> => {
    const { data } = await http.delete<ApiResponse<boolean>>(`/upload/image/${encodeURIComponent(publicId)}`);
    return data.success;
  }
};
