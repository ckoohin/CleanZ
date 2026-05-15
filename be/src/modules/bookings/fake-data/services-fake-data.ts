export interface ServiceFakeData {
  id: string;
  name: string;
  pricingType: 'hourly' | 'fixed';
  baseHourlyRate?: number;
  basePrice?: number;
  isAddon: boolean;
}
// Rule isAddOn = true => Là dịch vụ phụ, có thể chọn nhiều cho 1 booking
// isAddOn = false => Là dịch vụ chính, chỉ chọn 1 cho 1 booking
export const SERVICES_FAKE_DATA: ServiceFakeData[] = [
  {
    id: 'main-cleaning-general',
    name: 'Dọn dẹp tổng quát',
    pricingType: 'hourly',
    baseHourlyRate: 50000,
    isAddon: false,
  },
  {
    id: 'main-cleaning-industrial',
    name: 'Vệ sinh công nghiệp',
    pricingType: 'hourly',
    baseHourlyRate: 80000,
    isAddon: false,
  },
  {
    id: 'main-laundry',
    name: 'Giặt ủi',
    pricingType: 'hourly',
    baseHourlyRate: 45000,
    isAddon: false,
  },
  {
    id: 'main-post-construction',
    name: 'Dọn dẹp sau xây dựng',
    pricingType: 'hourly',
    baseHourlyRate: 100000,
    isAddon: false,
  },
  {
    id: 'addon-electronics',
    name: 'Vệ sinh thiết bị điện tử',
    pricingType: 'fixed',
    basePrice: 100000,
    isAddon: true,
  },
  {
    id: 'addon-curtains',
    name: 'Giặt rèm cửa',
    pricingType: 'fixed',
    basePrice: 150000,
    isAddon: true,
  },
  {
    id: 'addon-glass',
    name: 'Lau kính',
    pricingType: 'fixed',
    basePrice: 200000,
    isAddon: true,
  },
  {
    id: 'addon-aircon',
    name: 'Vệ sinh máy lạnh',
    pricingType: 'fixed',
    basePrice: 300000,
    isAddon: true,
  },
  {
    id: 'addon-sofa',
    name: 'Giặt ghế sofa',
    pricingType: 'fixed',
    basePrice: 250000,
    isAddon: true,
  },
  {
    id: 'addon-deodorize',
    name: 'Khử mùi, diệt khuẩn',
    pricingType: 'fixed',
    basePrice: 180000,
    isAddon: true,
  },
];

// eslint-disable-next-line prettier/prettier
export function getServiceFakeData(serviceId: string): ServiceFakeData | undefined {
  return SERVICES_FAKE_DATA.find((s) => s.id === serviceId);
}

export function getAddonFakeData(addonId: string): ServiceFakeData | undefined {
  const addon = SERVICES_FAKE_DATA.find((s) => s.id === addonId && s.isAddon);
  return addon;
}
