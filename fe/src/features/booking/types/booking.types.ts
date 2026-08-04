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

/** CASH: tiền mặt. WALLET: trừ ví ngay lúc tạo đơn. ONLINE: quét QR PayOS sau khi tạo đơn. */
export type PaymentMethod = "CASH" | "WALLET" | "ONLINE";
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
  /** Chênh lệch do chọn hạng Cao cấp — ĐÃ nằm trong basePrice, không cộng lại. */
  premiumFee?: number;
  discountAmount: number;
  totalPrice: number;
  subtotal?: number;
}

/** Hạng dịch vụ của đơn. */
export type BookingServiceTier = "STANDARD" | "PREMIUM";

/** Trạng thái xác minh bộ dụng cụ chuyên dụng của tasker. */
export type TaskerEquipmentStatus =
  "NONE" | "PENDING" | "APPROVED" | "REJECTED";

export type PremiumEligibilityIssue = "EQUIPMENT_NOT_APPROVED";

export interface TaskerPremiumAccess {
  canAccept: boolean;
  issues: PremiumEligibilityIssue[];
  message: string | null;
  equipmentStatus: TaskerEquipmentStatus;
}

export interface FavoriteTasker {
  taskerId: string;
  fullName: string | null;
  avatarUrl: string | null;
  ratingAvg: number;
  totalCompletedJobs: number;
  equipmentStatus: TaskerEquipmentStatus;
  /** Đủ tư cách nhận đơn Cao cấp ngay lúc này. */
  isPremiumEligible: boolean;
  presenceStatus: "ONLINE" | "OFFLINE";
  /** Số đơn thợ này đã hoàn thành cho chính khách. */
  completedJobsForCustomer: number;
  note: string | null;
  createdAt: string;
}

export type FavoriteTaskerAvailabilityStatus =
  "AVAILABLE" | "TIGHT_SCHEDULE" | "BUSY";

export interface FavoriteTaskerScheduleWindow {
  scheduledStartDate: string;
  scheduledStartTime: string;
  scheduledEndDate: string;
  scheduledEndTime: string;
}

export interface FavoriteTaskerAvailability extends FavoriteTasker {
  availability: {
    status: FavoriteTaskerAvailabilityStatus;
    isAvailable: boolean;
    reason: "OVERLAP" | "MAX_CONCURRENT" | null;
    message: string | null;
    conflict: FavoriteTaskerScheduleWindow | null;
    nearby:
      | (FavoriteTaskerScheduleWindow & {
          relation: "BEFORE" | "AFTER";
          gapMinutes: number;
        })
      | null;
  };
}

export interface FavoriteTaskerAvailabilityParams {
  scheduledDate: string;
  scheduledTime: string;
  durationHours: number;
}

export interface FavoriteTaskerContact {
  taskerId: string;
  fullName: string | null;
  phone: string | null;
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
  /** Chỉ có với method=ONLINE: URL checkout PayOS để mở trang thanh toán (fallback). */
  payosCheckoutUrl?: string | null;
  /** Chỉ có với method=ONLINE: chuỗi VietQR để render QR code trực tiếp. */
  payosQrCode?: string | null;
  /** BIN ngân hàng thụ hưởng — dùng để build VietQR image URL. */
  payosBin?: string | null;
  /** Số tài khoản thụ hưởng PayOS. */
  payosAccountNumber?: string | null;
  /** Tên chủ tài khoản thụ hưởng. */
  payosAccountName?: string | null;
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

/** Trạng thái thu phần phụ phí phát sinh thêm giờ. */
export type BookingSurchargeStatus =
  | "NONE"
  | "PENDING_CUSTOMER"
  | "PENDING_TASKER_CONFIRM"
  | "PAID"
  | "WAIVED"
  | "DISPUTED";

/** Trạng thái yêu cầu thêm giờ tasker gửi khách TRƯỚC khi làm thêm. */
export type BookingOvertimeRequestStatus =
  "NONE" | "NOTIFIED" | "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";

export type BookingNoShowReviewStatus =
  "NONE" | "PENDING_REVIEW" | "CONFIRMED" | "EXCUSED";

export interface BookingNoShow {
  reviewStatus: BookingNoShowReviewStatus;
  detectedAt: string | null;
  reviewedAt: string | null;
  refundAmount?: number;
  warningPoints?: number;
  /** Chỉ response Tasker mới trả hai trường giải trình này. */
  explanation?: string | null;
  explanationSubmittedAt?: string | null;
  reviewReason?: string | null;
}

/** Thời gian làm việc thực tế: giờ phát sinh (thêm giờ) và checkout sớm. */
export interface BookingWorkTiming {
  /** Số phút phát sinh được tính tiền chính xác theo thời gian thực tế. */
  overtimeMinutes: number;
  /** Số phút kết thúc sớm so với thời lượng đặt. */
  earlyMinutes: number;
  /** Phí phần phát sinh (= waitingFee). */
  surchargeFee: number;
  /** Đang chờ một bên xác nhận phần phát sinh (suy ra từ surchargeStatus). */
  surchargePending: boolean;
  surchargeStatus?: BookingSurchargeStatus;
  /** Số phút thêm giờ khách đã duyệt trước — thu chắc chắn, không hỏi lại. */
  approvedOvertimeMinutes?: number;
  /** Số tiền nền tảng đã ứng trả tasker khi khách không thanh toán. */
  platformAdvanceAmount?: number;
}

/** Thông báo phát sinh hoặc yêu cầu duyệt cũ gần nhất. */
export interface BookingOvertimeRequest {
  status: BookingOvertimeRequestStatus;
  minutes: number;
  fee: number;
  /** Hạn chót khách phải phản hồi (ISO); null khi đã có kết quả. */
  respondBy: string | null;
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
  serviceTier?: BookingServiceTier;
  /** Thợ yêu thích muốn ưu tiên — chỉ hợp lệ với đơn PREMIUM. */
  preferredTaskerId?: string;
  /** Số điện thoại người liên hệ tại chỗ (dùng khi đặt hộ người thân / bạn bè). */
  contactPhone?: string;
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
  serviceTier?: BookingServiceTier;
}

export interface CancelBookingDto {
  reason?: string;
}

export interface CustomerSchedulingPolicy {
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
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
  serviceTier?: BookingServiceTier;
  preferredTaskerId?: string;
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
  serviceTier?: BookingServiceTier;
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
  serviceTier?: BookingServiceTier;
  payment: BookingPayment;
  voucher?: { id: string; code: string; name: string } | null;
  tasker: BookingTasker | null;
  statusLogs: StatusLog[];
  note?: string | null;
  source?: BookingSource;
  confirmationDeadline?: string | null;
  workTiming?: BookingWorkTiming;
  noShow?: BookingNoShow;
  overtimeRequest?: BookingOvertimeRequest;
  createdAt: string;
  updatedAt: string;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
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
  serviceTier?: BookingServiceTier;
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
  premiumAccess?: TaskerPremiumAccess;
  invitation: TaskerBookingInvitationAccess;
  createdAt: string;
}

export interface TaskerBookingInvitationAccess {
  isInvited: boolean;
  isExclusive: boolean;
  publicAt?: string | null;
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
  serviceTier?: BookingServiceTier;
  distance: { meters: number; kilometers: number };
  service: BookingService;
  price: {
    totalPrice: number;
    basePrice: number;
    addonPrice?: number;
    peakFee: number;
    petFee: number;
    discountAmount: number;
    platformCommissionRate: number;
    platformFee: number;
    taskerIncome: number;
  };
  schedule: BookingSchedule;
  premiumAccess?: TaskerPremiumAccess;
  invitation: TaskerBookingInvitationAccess;
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

/**
 * Body của PATCH tasker/:id/check-in. Thiếu GPS hoặc ngoài bán kính policy thì backend
 * yêu cầu proofPhotoUrl (ảnh minh chứng) mới cho check-in.
 */
export interface TaskerCheckinPayload {
  currentLatitude?: number;
  currentLongitude?: number;
  accuracyMeters?: number;
  proofPhotoUrl?: string;
}

export interface TaskerAssignedBookingDetail {
  id: string;
  bookingCode: string;
  status: BookingStatus;
  serviceTier?: BookingServiceTier;
  source: BookingSource;
  canContactCustomer: boolean;
  checkinPolicy: {
    exemptFromLatePenalty: boolean;
    lateGraceMinutes: number;
    openBeforeMinutes: number;
    autoApproveRadiusMeters: number;
    maxAccuracyMeters: number;
    autoCancelAfterMinutes: number;
  };
  taskerCancelPenalty: {
    amount: number;
    penaltyPercent: number;
    hoursBeforeStart: number;
    matchedRule: {
      hoursBeforeStart: number;
      penaltyPercent: number;
    };
    policyVersion: number;
    effectiveFrom: string | null;
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
    /** Phụ phí phát sinh thêm giờ (đã nằm trong totalPrice sau khi khách xác nhận). */
    waitingFee?: number;
    discountAmount: number;
    /** Giá trước voucher — nền tảng thu hoa hồng trên mức này. */
    subtotal?: number;
    platformCommissionRate: number;
    platformFee: number;
    taskerIncome: number;
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
  workTiming?: BookingWorkTiming;
  noShow?: BookingNoShow;
  overtimeRequest?: BookingOvertimeRequest;
  createdAt: string;
  updatedAt: string;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
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
