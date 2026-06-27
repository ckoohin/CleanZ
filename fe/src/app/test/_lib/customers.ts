// Mock customer data for the /test customer-management sample.

export type CustomerStatus = 'active' | 'new' | 'locked';
export type CustomerTier = 'Thường' | 'Bạc' | 'Vàng' | 'Kim cương';

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  initials: string;
  area: string;
  bookings: number;
  spent: number;
  status: CustomerStatus;
  tier: CustomerTier;
  joined: string;
  lastActive: string;
  updatedBy: string;
  updatedByInitials: string;
  updatedAt: string;
};

export const customers: Customer[] = [
  { id: 'KH-1042', name: 'Nguyễn Thu Hà', email: 'thuha.nguyen@gmail.com', phone: '0901 234 567', initials: 'TH', area: 'Quận 1', bookings: 48, spent: 18_640_000, status: 'active', tier: 'Kim cương', joined: '12/03/2024', lastActive: '2 giờ trước', updatedBy: 'Quản trị viên', updatedByInitials: 'QT', updatedAt: '2 giờ trước' },
  { id: 'KH-1041', name: 'Lê Hoàng Nam', email: 'namlh@outlook.com', phone: '0902 345 678', initials: 'HN', area: 'Bình Thạnh', bookings: 31, spent: 9_220_000, status: 'active', tier: 'Vàng', joined: '03/04/2024', lastActive: 'Hôm qua', updatedBy: 'Lê Thu CSKH', updatedByInitials: 'LT', updatedAt: 'Hôm qua' },
  { id: 'KH-1040', name: 'Đỗ Minh Quân', email: 'quan.do@gmail.com', phone: '0903 456 789', initials: 'MQ', area: 'Quận 3', bookings: 27, spent: 7_980_000, status: 'active', tier: 'Vàng', joined: '21/04/2024', lastActive: '3 giờ trước', updatedBy: 'Phạm Hỗ Trợ', updatedByInitials: 'PH', updatedAt: '3 giờ trước' },
  { id: 'KH-1039', name: 'Vũ Khánh Linh', email: 'linhvk@gmail.com', phone: '0904 567 890', initials: 'KL', area: 'Thủ Đức', bookings: 12, spent: 3_420_000, status: 'active', tier: 'Bạc', joined: '05/05/2024', lastActive: 'Hôm nay', updatedBy: 'Quản trị viên', updatedByInitials: 'QT', updatedAt: 'Hôm nay' },
  { id: 'KH-1038', name: 'Bùi Thanh Tâm', email: 'tambt@yahoo.com', phone: '0905 678 901', initials: 'TT', area: 'Gò Vấp', bookings: 9, spent: 2_140_000, status: 'active', tier: 'Bạc', joined: '18/05/2024', lastActive: '5 ngày trước', updatedBy: 'Lê Thu CSKH', updatedByInitials: 'LT', updatedAt: '5 ngày trước' },
  { id: 'KH-1037', name: 'Phan Gia Bảo', email: 'baopg@gmail.com', phone: '0906 789 012', initials: 'GB', area: 'Quận 7', bookings: 3, spent: 640_000, status: 'new', tier: 'Thường', joined: '24/06/2026', lastActive: 'Hôm nay', updatedBy: 'Hệ thống', updatedByInitials: 'HT', updatedAt: 'Hôm nay' },
  { id: 'KH-1036', name: 'Trịnh Mỹ Duyên', email: 'duyentm@gmail.com', phone: '0907 890 123', initials: 'MD', area: 'Quận 1', bookings: 2, spent: 480_000, status: 'new', tier: 'Thường', joined: '25/06/2026', lastActive: 'Hôm qua', updatedBy: 'Hệ thống', updatedByInitials: 'HT', updatedAt: 'Hôm qua' },
  { id: 'KH-1035', name: 'Hoàng Anh Tú', email: 'tuha@gmail.com', phone: '0908 901 234', initials: 'AT', area: 'Phú Nhuận', bookings: 22, spent: 6_310_000, status: 'active', tier: 'Vàng', joined: '14/02/2024', lastActive: '1 tuần trước', updatedBy: 'Phạm Hỗ Trợ', updatedByInitials: 'PH', updatedAt: '1 tuần trước' },
  { id: 'KH-1034', name: 'Ngô Thị Hương', email: 'huongnt@gmail.com', phone: '0909 012 345', initials: 'TH', area: 'Tân Bình', bookings: 16, spent: 4_560_000, status: 'active', tier: 'Bạc', joined: '29/03/2024', lastActive: '2 ngày trước', updatedBy: 'Lê Thu CSKH', updatedByInitials: 'LT', updatedAt: '2 ngày trước' },
  { id: 'KH-1033', name: 'Đặng Văn Phúc', email: 'phucdv@gmail.com', phone: '0910 123 456', initials: 'VP', area: 'Quận 10', bookings: 1, spent: 0, status: 'locked', tier: 'Thường', joined: '08/01/2024', lastActive: '2 tháng trước', updatedBy: 'Quản trị viên', updatedByInitials: 'QT', updatedAt: '2 tháng trước' },
  { id: 'KH-1032', name: 'Lý Tuệ Mẫn', email: 'manlt@gmail.com', phone: '0911 234 567', initials: 'TM', area: 'Quận 5', bookings: 38, spent: 12_980_000, status: 'active', tier: 'Kim cương', joined: '02/12/2023', lastActive: 'Hôm nay', updatedBy: 'Quản trị viên', updatedByInitials: 'QT', updatedAt: 'Hôm nay' },
  { id: 'KH-1031', name: 'Cao Nhật Minh', email: 'minhcn@gmail.com', phone: '0912 345 678', initials: 'NM', area: 'Bình Thạnh', bookings: 7, spent: 1_780_000, status: 'active', tier: 'Bạc', joined: '11/05/2024', lastActive: '4 ngày trước', updatedBy: 'Phạm Hỗ Trợ', updatedByInitials: 'PH', updatedAt: '4 ngày trước' },
  { id: 'KH-1030', name: 'Tô Khánh Vy', email: 'vytk@gmail.com', phone: '0913 456 789', initials: 'KV', area: 'Quận 2', bookings: 19, spent: 5_240_000, status: 'active', tier: 'Vàng', joined: '23/03/2024', lastActive: 'Hôm qua', updatedBy: 'Lê Thu CSKH', updatedByInitials: 'LT', updatedAt: 'Hôm qua' },
  { id: 'KH-1029', name: 'Huỳnh Gia Hân', email: 'hanhg@gmail.com', phone: '0914 567 890', initials: 'GH', area: 'Quận 4', bookings: 4, spent: 920_000, status: 'new', tier: 'Thường', joined: '20/06/2026', lastActive: '3 ngày trước', updatedBy: 'Hệ thống', updatedByInitials: 'HT', updatedAt: '3 ngày trước' },
  { id: 'KH-1028', name: 'Phạm Quốc Đạt', email: 'datpq@gmail.com', phone: '0915 678 901', initials: 'QĐ', area: 'Thủ Đức', bookings: 2, spent: 360_000, status: 'locked', tier: 'Thường', joined: '15/04/2024', lastActive: '1 tháng trước', updatedBy: 'Quản trị viên', updatedByInitials: 'QT', updatedAt: '1 tháng trước' },
  { id: 'KH-1027', name: 'Võ Thuỳ Trang', email: 'trangvt@gmail.com', phone: '0916 789 012', initials: 'TT', area: 'Quận 1', bookings: 25, spent: 8_120_000, status: 'active', tier: 'Vàng', joined: '07/02/2024', lastActive: '6 giờ trước', updatedBy: 'Phạm Hỗ Trợ', updatedByInitials: 'PH', updatedAt: '6 giờ trước' },
];

export const customerStats = {
  total: 2847,
  newThisMonth: 312,
  newDeltaPct: 18,
  active: 2610,
  vip: 184,
};

export const TIER_META: Record<CustomerTier, { color: string; soft: string }> = {
  'Kim cương': { color: '#7C3AED', soft: 'rgba(124,58,237,0.12)' },
  'Vàng': { color: '#B45309', soft: 'rgba(245,158,11,0.14)' },
  'Bạc': { color: '#475569', soft: 'rgba(71,85,105,0.12)' },
  'Thường': { color: '#64748B', soft: 'rgba(100,116,139,0.10)' },
};

export const STATUS_META: Record<CustomerStatus, { label: string; color: string; soft: string }> = {
  active: { label: 'Hoạt động', color: '#0E9F6E', soft: 'rgba(14,159,110,0.12)' },
  new: { label: 'Mới', color: '#2563EB', soft: 'rgba(37,99,235,0.12)' },
  locked: { label: 'Đã khoá', color: '#E11D48', soft: 'rgba(225,29,72,0.12)' },
};
