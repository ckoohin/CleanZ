// types/service.type.ts

export interface PricingConfig {
  id: string;
  name: string;
  basePrice: string;
  peakPrice: string | null;
  petFee: string;
  waitingFee: string;
  platformCommissionRate: string;
  isActive: boolean;
}

export interface SubService {
  id: string;
  subServiceCode: string;
  name: string;
  description: string;
  shortDescription: string | null;
  durationHours: string;
  coverageArea: string | null;
  isActive: boolean;
  thumbnailUrl: string;
  galleryUrls: string[];
  pricingType: string;
  pricingConfig: PricingConfig | null;
}

// Chi tiết đầy đủ cho trang /catalog/[id]
export type SubServiceDetail = SubService;

export interface SubServiceListResponse {
  items: SubService[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Category tĩnh để phân nhóm dịch vụ
export type ServiceCategory =
  | "all"
  | "cleaning"       // Dọn dẹp
  | "ac"             // Điều hòa / Máy lạnh
  | "laundry"        // Giặt là / Sofa
  | "pest"           // Diệt côn trùng
  | "deep-clean"     // Vệ sinh tổng
  | "office"         // Tạp vụ / Văn phòng
  | "other";         // Khác

export const CATEGORY_KEYWORDS: Record<ServiceCategory, string[]> = {
  all:        [],
  cleaning:   ["dọn", "vệ sinh", "nhà", "căn hộ", "cleaning"],
  ac:         ["máy lạnh", "điều hòa", "ac", "air"],
  laundry:    ["giặt", "sofa", "nệm", "rèm", "laundry"],
  pest:       ["diệt", "côn trùng", "gián", "chuột", "pest"],
  "deep-clean": ["tổng", "deep", "cuối năm", "cuối"],
  office:     ["tạp vụ", "văn phòng", "công ty", "office"],
  other:      [],
};

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  all:          "Tất cả",
  cleaning:     "Dọn dẹp",
  ac:           "Máy lạnh",
  laundry:      "Giặt là",
  pest:         "Diệt côn trùng",
  "deep-clean": "Tổng vệ sinh",
  office:       "Tạp vụ",
  other:        "Khác",
};

export const CATEGORY_ORDER: ServiceCategory[] = [
  "all", "cleaning", "deep-clean", "ac", "laundry", "pest", "office", "other",
];