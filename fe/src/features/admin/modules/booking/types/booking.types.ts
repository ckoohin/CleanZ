export interface CreateAdminBookingDto {
  customerId: string;
  serviceId: string;
  addressId?: string;
  scheduledDate: string;
  scheduledTime: string;
  paymentMethod: string;
  voucherCode?: string;
  taskerId?: string;
  note?: string;
  reason: string;
}

export interface AvailableTaskersQueryDto {
  keyword?: string;
  page?: number;
  limit?: number;
}

export interface AssignTaskerDto {
  taskerId: string;
  note?: string;
}

export interface ChangeBookingStatusDto {
  status: string;
  reason: string;
}

export interface AdminBookingItem {
  id: string;
  bookingCode: string;
  customer?: {
    id: string;
    userId: string;
    fullName: string;
    email: string;
    phone: string | null;
  };
  tasker?: {
    id: string;
    userId: string;
    fullName: string;
    email: string;
    phone: string | null;
  } | null;
  service: {
    id: string;
    code: string | null;
    name: string | null;
  };
  address: string;
  scheduledStart: string | null;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
}

export interface AdminBookingDetail {
  id: string;
  bookingCode?: string;
  status?: string;
  totalPrice?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  scheduledStart?: string;
  durationHours?: number;
  address?: {
    id: string | null;
    label: string | null;
    fullAddress: string;
    district?: string | null;
    wardDetail?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    hasPet: boolean;
  };
  note?: string;
  customer?: {
    id: string;
    userId: string;
    fullName?: string;
    email?: string;
    phone?: string | null;
    avatarUrl?: string | null;
  };
  tasker?: {
    id: string;
    userId: string;
    fullName?: string;
    email?: string;
    phone?: string | null;
    avatarUrl?: string | null;
    ratingAvg?: number;
  } | null;
  service?: {
    id: string;
    code: string | null;
    name: string | null;
    description?: string | null;
  };
}
