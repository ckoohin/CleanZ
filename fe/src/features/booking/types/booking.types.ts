// ─── Enums ────────────────────────────────────────────────────────────────────
export type BookingStatus =
  | "POSTED"
  | "CONFIRMED"
  | "TASKER_ON_THE_WAY"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

export type PaymentMethod = "CASH" | "WALLET" | "ONLINE";
export type PaymentStatus = "PENDING" | "PAID" | "REFUNDED" | "FAILED";

// ─── Shared sub-types ─────────────────────────────────────────────────────────
export interface BookingService {
  id: string;
  name: string;
  description?: string | null;
}

export interface BookingSchedule {
  scheduledStartDate: string | null;
  scheduledStartTime: string | null;
  scheduledEndDate: string | null;
  scheduledEndTime: string | null;
  durationHours: number;
}

export interface BookingPrice {
  basePrice: number;
  addonPrice?: number;
  peakFee: number;
  petFee: number;
  waitingFee?: number;
  discountAmount: number;
  totalPrice: number;
  subtotal?: number;
}

export interface BookingAddress {
  id: string | null;
  label?: string | null;
  fullAddress: string;
  wardDetail?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  hasPet: boolean;
}

export interface BookingPayment {
  method: PaymentMethod;
  status: PaymentStatus;
  latestPaymentId?: string | null;
  amount?: number | null;
  transactionCode?: string | null;
  paidAt?: string | null;
}

export interface BookingTasker {
  id: string;
  fullName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  ratingAvg?: number;
}

export interface StatusLog {
  id: string;
  oldStatus: BookingStatus | null;
  newStatus: BookingStatus;
  note?: string | null;
  createdAt: string;
}

// ─── Customer DTOs ────────────────────────────────────────────────────────────
export interface CreateBookingDto {
  serviceId?: string;
  addressId?: string;
  scheduledDate: string;    // YYYY-MM-DD
  scheduledTime: string;    // HH:mm
  note?: string;
  paymentMethod?: PaymentMethod;
  voucherCode?: string;
}

export interface QuoteBookingDto {
  serviceId?: string;
  addressId?: string;
  scheduledDate: string;
  scheduledTime: string;
  note?: string;
  voucherCode?: string;
}

export interface CancelBookingDto {
  reason?: string;
}

export interface UpdateBookingScheduleDto {
  addressId?: string;
  latitude?: number;
  longitude?: number;
  scheduledDate?: string;
  scheduledTime?: string;
}

// ─── Customer Responses ───────────────────────────────────────────────────────
export interface BookingQuoteResponse {
  service: BookingService;
  address: BookingAddress;
  schedule: BookingSchedule;
  price: BookingPrice;
  voucher?: { id: string; code: string; name: string } | null;
}

export interface CustomerBookingDetail {
  id: string;
  bookingCode: string;
  status: BookingStatus;
  service: BookingService;
  address: BookingAddress;
  schedule: BookingSchedule;
  price: BookingPrice;
  payment: BookingPayment;
  voucher?: { id: string; code: string; name: string } | null;
  tasker: BookingTasker | null;
  statusLogs: StatusLog[];
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerActiveBookingResponse {
  booking: CustomerBookingDetail | null;
}

// ─── Tasker Responses ─────────────────────────────────────────────────────────
export interface TaskerPostedBookingItem {
  id: string;
  bookingCode: string;
  status: BookingStatus;
  service: BookingService;
  area: { displayAddress?: string | null };
  schedule: BookingSchedule;
  price: {
    totalPrice: number;
    basePrice: number;
    peakFee: number;
    petFee: number;
    discountAmount: number;
  };
  flags: { hasPet: boolean };
  createdAt: string;
}

export interface TaskerPostedBookingListResponse {
  total: number;
  items: TaskerPostedBookingItem[];
}

export interface TaskerPostedBookingDetail {
  distance: { meters: number; kilometers: number };
  service: BookingService;
  price: {
    totalPrice: number;
    basePrice: number;
    peakFee: number;
    petFee: number;
    discountAmount: number;
  };
  schedule: BookingSchedule;
}

export interface TaskerAcceptResponse {
  id: string;
  bookingCode: string;
  status: BookingStatus;
  tasker: {
    id: string;
    fullName?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
  };
  schedule: BookingSchedule;
}

export interface TaskerAssignedBookingDetail {
  id: string;
  bookingCode: string;
  status: BookingStatus;
  canContactCustomer: boolean;
  service: BookingService;
  distance: { meters: number; kilometers: number } | null;
  area?: { displayAddress?: string | null };
  address?: {
    fullAddress: string;
    wardDetail?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    hasPet: boolean;
  };
  schedule: BookingSchedule;
  price: {
    totalPrice: number;
    basePrice: number;
    peakFee: number;
    petFee: number;
    discountAmount: number;
  };
  payment?: { method: string; status: string };
  customer?: {
    id: string;
    fullName?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
  };
  note?: string | null;
  flags: { hasPet: boolean };
  createdAt: string;
  updatedAt: string;
  checkedInAt?: string | null;
  completedAt?: string | null;
}
