import { useQuery } from '@tanstack/react-query';

export interface PublicCategory {
  id: string;
  name: string;
  slug: string;
  iconUrl?: string;
  sortOrder: number;
}

export interface PublicService {
  id: string;
  name: string;
  categoryId: string;
  description?: string;
  thumbnailUrl?: string;
  galleryUrls?: string[];
  shortDescription?: string;
  includedTasks?: string[];
  excludedTasks?: string[];
  baseDurationHours?: number;
  basePrice?: number;
}

// Mock Categories for Landing page and Public view (Backend doesn't manage Categories directly in DB)
const mockPublicCategories: PublicCategory[] = [
  { id: "cleaning", name: "Dọn dẹp nhà cửa", slug: "cleaning", sortOrder: 1 },
  { id: "deep-cleaning", name: "Tổng vệ sinh", slug: "deep-cleaning", sortOrder: 2 },
  { id: "sofa", name: "Giặt Sofa/Nệm", slug: "sofa", sortOrder: 3 },
  { id: "curtain", name: "Vệ sinh rèm", slug: "curtain", sortOrder: 4 },
  { id: "office", name: "Tạp vụ VP", slug: "office", sortOrder: 5 },
  { id: "glass", name: "Vệ sinh kính", slug: "glass", sortOrder: 6 },
];

// Mock Services for Landing page and Public view (Required for guest users who don't have JWT auth token to access /admin/services)
const mockPublicServices: PublicService[] = [
  {
    id: "srv-cleaning-1",
    name: "Dọn dẹp nhà theo giờ",
    categoryId: "cleaning",
    description: "Giải pháp dọn dẹp linh hoạt, đặt lịch nhanh chóng. Người giúp việc có mặt sau 60 phút, dọn sạch mọi ngóc ngách.",
    thumbnailUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80",
    baseDurationHours: 2,
    basePrice: 140000,
    shortDescription: "Người giúp việc có mặt sau 60 phút, dọn sạch mọi ngóc ngách.",
    includedTasks: ["Quét nhà, lau sàn", "Lau bụi nội thất", "Dọn dẹp phòng vệ sinh", "Rửa chén bát"],
    excludedTasks: ["Vệ sinh trên cao nguy hiểm", "Vệ sinh thiết bị điện tử chuyên sâu", "Dọn dẹp rác thải công nghiệp"]
  },
  {
    id: "srv-deep-1",
    name: "Tổng vệ sinh chuyên sâu",
    categoryId: "deep-cleaning",
    description: "Làm sạch toàn diện nhà mới xây, nhà lâu ngày không dọn. Bao gồm máy móc chuyên dụng và dung dịch tẩy rửa.",
    thumbnailUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80",
    baseDurationHours: 4,
    basePrice: 600000,
    shortDescription: "Bao gồm máy móc chuyên dụng và dung dịch tẩy rửa chuyên sâu.",
    includedTasks: ["Tẩy sạch sơn thừa, xi măng", "Chà sàn bằng máy công nghiệp", "Lau kính mặt trong và mặt ngoài tầm thấp"],
    excludedTasks: ["Đu dây lau kính mặt ngoài tầm cao", "Vận chuyển rác xà bần công trình lớn"]
  },
  {
    id: "srv-sofa-1",
    name: "Giặt Sofa & Nệm tại nhà",
    categoryId: "sofa",
    description: "Giặt sạch vết bẩn, khử mùi và diệt khuẩn 99% bằng công nghệ phun hút hơi nước nóng 140 độ C.",
    thumbnailUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80",
    baseDurationHours: 1.5,
    basePrice: 250000,
    shortDescription: "Công nghệ phun hút hơi nước nóng khử khuẩn 99%.",
    includedTasks: ["Hút bụi bề mặt sofa/nệm", "Phun dung dịch vệ sinh sinh học", "Hơi nước nóng diệt khuẩn", "Sấy khô 80% bằng máy thổi chuyên dụng"]
  }
];

export const usePublicCategories = () => {
  return useQuery({
    queryKey: ['public-categories'],
    queryFn: async (): Promise<PublicCategory[]> => {
      return mockPublicCategories;
    },
  });
};

export const usePublicServices = (categoryId?: string) => {
  return useQuery({
    queryKey: ['public-services', categoryId],
    queryFn: async (): Promise<PublicService[]> => {
      if (categoryId) {
        return mockPublicServices.filter(s => s.categoryId === categoryId);
      }
      return mockPublicServices;
    },
  });
};

export const usePublicServiceDetail = (idOrSlug: string | undefined) => {
  return useQuery({
    queryKey: ['public-service-detail', idOrSlug],
    queryFn: async (): Promise<PublicService | null> => {
      if (!idOrSlug) return null;
      return mockPublicServices.find(s => s.id === idOrSlug) || null;
    },
    enabled: !!idOrSlug,
  });
};
