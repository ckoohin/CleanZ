export interface CustomerListItem {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  isVerified: boolean;
  defaultPaymentMethod: string | null;
  totalBookings: number;
  totalCancelled: number;
  createdAt: string;
  lastLogin: string | null;
}

export interface CustomerQueryFilter {
  keyword?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedCustomersResponse {
  data: CustomerListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CustomerAddress {
  id: string;
  label: string;
  fullAddress: string;
  wardDetail: string | null;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  hasPet: boolean;
}

export interface CustomerStats {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalSpent: number;
  completionRate: number;
  aov: number;
}

export interface CustomerDetailResponse {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  isVerified: boolean;
  provider: string;
  defaultPaymentMethod: string | null;
  totalBookings: number;
  totalCancelled: number;
  createdAt: string;
  lastLogin: string | null;
  addresses: CustomerAddress[];
  stats: CustomerStats;
}

export interface CustomerBookingItem {
  id: string;
  bookingCode: string;
  totalPrice: number;
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
}

export interface PaginatedCustomerBookingsResponse {
  data: CustomerBookingItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ToggleCustomerStatusResponse {
  message: string;
  isActive: boolean;
}

export type PaymentMethod = "CASH" | "MOMO" | "ZALOPAY" | "VNPAY" | "VIETQR";

export interface CreateCustomerPayload {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  defaultPaymentMethod?: PaymentMethod;
}

export interface UpdateCustomerPayload {
  fullName?: string;
  phone?: string;
  defaultPaymentMethod?: PaymentMethod;
}

export interface DeleteCustomerResponse {
  message: string;
}
