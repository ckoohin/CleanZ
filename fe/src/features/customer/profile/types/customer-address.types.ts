export interface CustomerAddress {
  id: string;
  label: string | null;
  fullAddress: string;
  wardDetail: string | null;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  hasPet: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerAddressDto {
  label?: string | null;
  fullAddress: string;
  wardDetail?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
  hasPet?: boolean;
}
