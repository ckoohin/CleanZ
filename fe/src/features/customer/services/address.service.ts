import http from "@/lib/api/http";

export interface CustomerAddress {
  id: string;
  label: string | null;
  fullAddress: string;
  wardDetail: string | null;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  hasPet: boolean;
  contactName: string | null;
  contactPhone: string | null;
  buildingFloor: string | null;
  gate: string | null;
  driverNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertCustomerAddressDto {
  label?: string | null;
  fullAddress: string;
  wardDetail?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
  hasPet?: boolean;
  contactName?: string | null;
  contactPhone?: string | null;
  buildingFloor?: string | null;
  gate?: string | null;
  driverNote?: string | null;
}

export interface UpdateCustomerAddressDto {
  label?: string | null;
  fullAddress?: string;
  wardDetail?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
  hasPet?: boolean;
  contactName?: string | null;
  contactPhone?: string | null;
  buildingFloor?: string | null;
  gate?: string | null;
  driverNote?: string | null;
}

export const customerAddressApi = {
  /** Lấy danh sách địa chỉ đã lưu */
  findMyAddresses: (): Promise<CustomerAddress[]> =>
    http.get<{ data?: CustomerAddress[] }>("/customer/addresses").then((r) => r.data.data ?? (r.data as unknown as CustomerAddress[])),

  /** Tạo địa chỉ mới */
  createMyAddress: (dto: UpsertCustomerAddressDto): Promise<CustomerAddress> =>
    http.post<{ data?: CustomerAddress }>("/customer/addresses", dto).then((r) => r.data.data ?? (r.data as unknown as CustomerAddress)),

  /** Cập nhật địa chỉ */
  updateMyAddress: (id: string, dto: UpdateCustomerAddressDto): Promise<CustomerAddress> =>
    http.patch<{ data?: CustomerAddress }>(`/customer/addresses/${id}`, dto).then((r) => r.data.data ?? (r.data as unknown as CustomerAddress)),

  /** Đặt địa chỉ mặc định */
  setMyDefaultAddress: (id: string): Promise<{ success: boolean; message: string }> =>
    http.patch<{ success: boolean; message: string }>(`/customer/addresses/${id}/default`).then((r) => r.data),
};
