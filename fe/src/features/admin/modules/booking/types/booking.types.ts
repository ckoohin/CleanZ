export interface CreateAdminBookingDto {
  customerId: string;
  packageId: string;
  pricingTierId?: string;
  durationHours?: number;
  areaM2?: number;
  addonIds?: string[];
  addressId?: string;
  scheduledDate: string;
  scheduledTime: string;
  paymentMethod: string;
  voucherCode?: string;
  hasPet?: boolean;
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
    // null cho đơn offline/vãng lai (không gắn tài khoản khách).
    id: string | null;
    userId: string | null;
    fullName: string;
    email: string | null;
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
  schedule?: {
    scheduledStart: string | null;
    scheduledStartDate: string | null;
    scheduledStartTime: string | null;
    scheduledEnd: string | null;
    scheduledEndDate: string | null;
    scheduledEndTime: string | null;
    durationHours: number;
  };
  totalPrice: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
}

export interface AdminBookingTimelineEntry {
  id: string;
  oldStatus: string | null;
  newStatus: string;
  note: string | null;
  changedBy: { id: string; fullName: string; role: string } | null;
  cancelledBy: string | null;
  cancelledByUser: { id: string; fullName: string; role: string } | null;
  cancelReason: string | null;
  cancellationFee: number;
  refundAmount: number;
  paymentId: string | null;
  createdAt: string;
}

export interface AdminBookingDetail {
  id: string;
  bookingCode?: string;
  status?: string;
  note?: string;
  cancelledBy?: string | null;
  createdAt?: string;

  customer?: {
    // null cho đơn offline/vãng lai (không gắn tài khoản khách).
    id: string | null;
    userId: string | null;
    fullName?: string;
    email?: string | null;
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

  address?: {
    id: string | null;
    label: string | null;
    fullAddress: string;
    district?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    hasPet: boolean;
  };

  schedule?: {
    scheduledStart: string | null;
    scheduledEnd: string | null;
    scheduledStartDate: string | null;
    scheduledStartTime: string | null;
    scheduledEndDate: string | null;
    scheduledEndTime: string | null;
    durationHours: number;
  };

  price?: {
    basePrice: number;
    addonPrice: number;
    peakFee: number;
    petFee: number;
    waitingFee: number;
    discountAmount: number;
    totalPrice: number;
  };

  operation?: {
    acceptedAt: string | null;
    checkedInAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
    timeline: AdminBookingTimelineEntry[];
  };

  payment?: {
    status: string;
    method: string;
    totalPrice: number;
    platformFee: number | null;
    taskerIncome: number | null;
    commissionRate: number | null;
    isEstimated: boolean;
    latestPayment?: {
      id: string;
      status: string;
      method: string;
      amount: number;
      transactionCode: string | null;
      paidAt: string | null;
      refundedAt: string | null;
      createdAt: string;
    } | null;
    voucher?: {
      id: string;
      code: string;
      name: string;
      type: string;
      value: number;
      discountAmount: number;
    } | null;
  };
}
