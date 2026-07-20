// ─── Enums ────────────────────────────────────────────────────────────────────
export type BookingStatus =
  | "POSTED"
  | "PENDING_CUSTOMER_CONFIRMATION"
  | "CONFIRMED"
  | "TASKER_ON_THE_WAY"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

export type BookingSource = "CUSTOMER_APP" | "TASKER_CREATED";

/** 3 hình thức cân sổ (ADYEN = "Chuyển khoản", sandbox). Các cổng MOMO/VNPAY/ZaloPay/VietQR chưa từng được tích hợp nên đã bỏ. */
export type PaymentMethod = "CASH" | "WALLET" | "ADYEN";
export type PaymentStatus = "PENDING" | "PAID" | "REFUNDED" | "FAILED";

// ─── Shared sub-types ─────────────────────────────────────────────────────────
export interface BookingService {
  id: string;
  name: string;
  description?: string | null;
}

export interface BookingAddon {
  id: string;
  name: string;
  price: number;
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
  totalCompletedJobs?: number;
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
  packageId?: string; // ID ServicePackage (bắt buộc trên BE)
  subServiceIds?: string[]; // Legacy: tạm không dùng trong luồng booking mới
  addonIds?: string[]; // Danh sách ID option/dịch vụ thêm
  addressId?: string;
  address?: string; // Địa chỉ nhập tay
  provinceCode?: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  note?: string;
  paymentMethod?: PaymentMethod;
  voucherCode?: string;
  areaM2?: number;
  pricingTierId?: string;
  durationHours?: number;
  hasPet?: boolean;
  quoteId?: string; // ID báo giá từ POST /booking/quote — dùng để khóa giá
  /** Adyen thẻ mới: id đã cấp trước từ POST /booking/checkout/adyen-session. */
  id?: string;
  /** Adyen thẻ mới: id phiên Drop-in. */
  adyenSessionId?: string;
  /** Adyen thẻ mới: sessionResult từ Drop-in onPaymentCompleted. */
  adyenSessionResult?: string;
  /** Adyen thẻ đã lưu: id thẻ chọn để charge ngay. */
  adyenStoredPaymentMethodId?: string;
}

export interface AdyenBookingCheckoutSession {
  bookingId: string;
  adyenSessionId: string;
  adyenSessionData: string;
  adyenClientKey: string;
}

export interface QuoteBookingDto {
  packageId?: string;
  subServiceIds?: string[];
  addonIds?: string[];
  addressId?: string;
  address?: string;
  provinceCode?: string;
  scheduledDate: string;
  scheduledTime: string;
  note?: string;
  voucherCode?: string;
  areaM2?: number;
  pricingTierId?: string;
  durationHours?: number;
  hasPet?: boolean;
}

export interface CancelBookingDto {
  reason?: string;
}

// BE chỉ nhận addressId (địa chỉ đã lưu, có tọa độ validated) — không nhận
// tọa độ tự do vì dispatch tasker cần địa chỉ chuẩn hoá.
export interface UpdateBookingScheduleDto {
  addressId?: string;
  scheduledDate?: string;
  scheduledTime?: string;
}

// State dùng trong BookingWizard (lưu toàn bộ form data qua các step)
export interface BookingFormState {
  serviceId: string; // ServicePackage ID (alias cho dễ đọc)
  packageId?: string; // ServicePackage ID (field gửi lên BE)
  subServiceIds?: string[]; // Legacy: tạm không dùng trong luồng booking mới
  addonIds?: string[]; // Addon IDs gửi lên BE
  addressId: string;
  address: string;
  provinceCode?: string;
  scheduledDate: string;
  scheduledTime: string;
  note?: string;
  paymentMethod: PaymentMethod;
  voucherCode?: string;
  areaM2?: number;
  pricingTierId?: string;
  durationHours?: number;
  hasPet?: boolean;
}

// ─── Customer Responses ───────────────────────────────────────────────────────
export interface BookingQuoteResponse {
  quoteId: string;
  quoteExpiresAt: string;
  service: BookingService;
  addons?: BookingAddon[];
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
  source?: BookingSource;
  confirmationDeadline?: string | null;
  createdAt: string;
  updatedAt: string;
  checkedInAt?: string | null;
  completedAt?: string | null;
}

export interface CustomerActiveBookingResponse {
  booking: CustomerBookingDetail | null;
}

export interface CustomerBookingListResponse {
  items: CustomerBookingDetail[];
  total: number;
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
    addonPrice?: number;
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

export interface TaskerCompletedBookingItem {
  id: string;
  bookingCode: string;
  service: { id: string; name: string };
  schedule: {
    scheduledStartDate?: string | null;
    scheduledStartTime?: string | null;
    durationHours: number;
  };
  totalPrice: number;
  paymentMethod: PaymentMethod;
  completedAt?: string | null;
}

export interface TaskerCompletedBookingListResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  items: TaskerCompletedBookingItem[];
}

export interface TaskerCompletedBookingRange {
  fromAt: string;
  toAt: string;
}

export interface TaskerPostedBookingDetail {
  distance: { meters: number; kilometers: number };
  service: BookingService;
  price: {
    totalPrice: number;
    basePrice: number;
    addonPrice?: number;
    peakFee: number;
    petFee: number;
    discountAmount: number;
    platformCommissionRate?: number;
    platformFee?: number;
    taskerIncome?: number;
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
  source: BookingSource;
  canContactCustomer: boolean;
  checkinPolicy: {
    exemptFromLatePenalty: boolean;
    lateGraceMinutes: number;
  };
  checkinResult?: {
    minutesLate: number;
    warningPoints: number;
    alreadyCheckedIn?: boolean;
  };
  service: BookingService;
  distance: { meters: number; kilometers: number } | null;
  area?: { displayAddress?: string | null };
  address?: {
    fullAddress: string;
    wardDetail?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    hasPet: boolean;
    contactName?: string | null;
    contactPhone?: string | null;
    buildingFloor?: string | null;
    gate?: string | null;
    driverNote?: string | null;
  };
  schedule: BookingSchedule;
  price: {
    totalPrice: number;
    basePrice: number;
    addonPrice?: number;
    peakFee: number;
    petFee: number;
    discountAmount: number;
  };
  payment?: { method: string; status: string };
  customer?: {
    // null khi là khách vãng lai (đơn offline không gắn tài khoản).
    id: string | null;
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

// ─── Tasker tạo đơn hộ customer ───────────────────────────────────────────────
export interface CustomerLookupResult {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  addresses: {
    id: string;
    label: string | null;
    fullAddress: string;
    isDefault: boolean;
    hasPet: boolean;
  }[];
}

export interface CreateBookingForCustomerDto {
  customerPhone: string;
  // Tên khách vãng lai — chỉ gửi khi SĐT chưa có tài khoản (tạo đơn offline).
  customerName?: string;
  packageId: string;
  addonIds?: string[];
  addressId?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  scheduledDate?: string;
  scheduledTime?: string;
  durationHours?: number;
  hasPet?: boolean;
  areaM2?: number;
  pricingTierId?: string;
  note?: string;
  paymentMethod?: PaymentMethod;
  voucherCode?: string;
}

export interface TaskerCreatedBookingResponse {
  id: string;
  bookingCode: string;
  status: BookingStatus;
  source: BookingSource;
  // null cho đơn offline/vãng lai (vào thẳng CONFIRMED, không chờ xác nhận).
  confirmationDeadline: string | null;
  customer: { id: string | null; fullName: string };
  tasker: { id: string; fullName: string | null };
  service: { id: string; name: string };
  address: { fullAddress: string; hasPet: boolean };
  schedule: BookingSchedule;
  price: {
    basePrice: number;
    addonPrice: number;
    peakFee: number;
    petFee: number;
    discountAmount: number;
    totalPrice: number;
  };
  payment: { method: PaymentMethod; status: PaymentStatus };
  voucher: { id: string; code: string; name: string } | null;
  note: string | null;
  createdAt: string;
}
