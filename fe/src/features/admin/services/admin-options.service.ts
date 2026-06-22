import http from '@/lib/api/http';
import { ApiResponse } from './admin-services.service';

export enum PriceType {
  FIXED_ADD = 'FIXED_ADD',
  MULTIPLY = 'MULTIPLY',
  PER_UNIT = 'PER_UNIT',
  NONE = 'NONE',
}

export interface ServiceOptionChoiceEntity {
  id: string;
  optionId: string;
  name: string;
  priceType: PriceType;
  priceValue: number;
  durationValue: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceOptionEntity {
  id: string;
  serviceId: string;
  name: string;
  description?: string;
  isRequired: boolean;
  isMultiple: boolean;
  sortOrder: number;
  choices: ServiceOptionChoiceEntity[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceOptionDto {
  name: string;
  description?: string;
  isRequired?: boolean;
  isMultiple?: boolean;
  sortOrder?: number;
}

export type UpdateServiceOptionDto = Partial<CreateServiceOptionDto>;

export interface CreateServiceOptionChoiceDto {
  name: string;
  priceType: PriceType;
  priceValue: number;
  durationValue?: number;
  sortOrder?: number;
}

export type UpdateServiceOptionChoiceDto = Partial<CreateServiceOptionChoiceDto>;

export const adminOptionsApi = {
  createOption: async (serviceId: string, payload: CreateServiceOptionDto) => {
    const { data } = await http.post<ApiResponse<ServiceOptionEntity>>(`/admin/services/${serviceId}/options`, payload);
    return data.data;
  },

  updateOption: async ({ id, payload }: { id: string; payload: UpdateServiceOptionDto }) => {
    const { data } = await http.patch<ApiResponse<ServiceOptionEntity>>(`/admin/services/options/${id}`, payload);
    return data.data;
  },

  deleteOption: async (id: string) => {
    await http.delete(`/admin/services/options/${id}`);
  },

  createChoice: async (optionId: string, payload: CreateServiceOptionChoiceDto) => {
    const { data } = await http.post<ApiResponse<ServiceOptionChoiceEntity>>(`/admin/services/options/${optionId}/choices`, payload);
    return data.data;
  },

  updateChoice: async ({ id, payload }: { id: string; payload: UpdateServiceOptionChoiceDto }) => {
    const { data } = await http.patch<ApiResponse<ServiceOptionChoiceEntity>>(`/admin/services/options/choices/${id}`, payload);
    return data.data;
  },

  deleteChoice: async (id: string) => {
    await http.delete(`/admin/services/options/choices/${id}`);
  },
};
