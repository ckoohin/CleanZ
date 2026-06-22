export interface UpdateCustomerProfileInput {
  fullName: string;
  phone: string;
  avatar?: File;
}

export interface CustomerProfileResponse {
  id: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    phone?: string | null;
    avatarUrl?: string | null;
  };
  defaultPaymentMethod: string;
  totalBookings: number;
  totalCancelled: number;
  createdAt: string;
  updatedAt: string;
}
