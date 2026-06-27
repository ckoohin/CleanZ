// Mock data for the CleanZ admin design sample at /test. Self-contained.

export function formatVnd(n: number): string {
  return n.toLocaleString('vi-VN') + '₫';
}

export const TODAY_LABEL = 'Thứ Bảy, 27 tháng 6, 2026';

export const gmvSeries: { day: string; value: number }[] = [
  { day: '14/6', value: 32_400_000 },
  { day: '15/6', value: 28_900_000 },
  { day: '16/6', value: 35_600_000 },
  { day: '17/6', value: 41_200_000 },
  { day: '18/6', value: 38_700_000 },
  { day: '19/6', value: 45_300_000 },
  { day: '20/6', value: 52_100_000 },
  { day: '21/6', value: 47_800_000 },
  { day: '22/6', value: 43_500_000 },
  { day: '23/6', value: 50_900_000 },
  { day: '24/6', value: 57_600_000 },
  { day: '25/6', value: 53_200_000 },
  { day: '26/6', value: 49_400_000 },
  { day: '27/6', value: 61_250_000 },
];

export const hero = {
  todayGmv: 61_250_000,
  deltaPct: 12.4,
  ordersToday: 134,
  spark: gmvSeries.map((d) => d.value),
};

export type Trend = 'up' | 'down';

export type Kpi = {
  key: string;
  label: string;
  value: string;
  sub: string;
  deltaPct: number;
  trend: Trend;
  goodWhenDown?: boolean;
  spark: number[];
};

export const kpis: Kpi[] = [
  { key: 'commission', label: 'Hoa hồng nền tảng', value: '184,6tr', sub: 'Tháng này · GMV × 15%', deltaPct: 9.1, trend: 'up', spark: [120, 132, 128, 145, 150, 162, 184] },
  { key: 'orders', label: 'Đơn hoàn tất', value: '1.231', sub: '560 đơn đang hoạt động', deltaPct: 6.7, trend: 'up', spark: [840, 910, 880, 1020, 1080, 1160, 1231] },
  { key: 'taskers', label: 'Tasker hoạt động', value: '318', sub: '142 đang trực tuyến', deltaPct: 4.2, trend: 'up', spark: [260, 271, 288, 295, 301, 310, 318] },
  { key: 'cancel', label: 'Tỷ lệ huỷ đơn', value: '3,8%', sub: 'Mục tiêu < 5%', deltaPct: 1.3, trend: 'down', goodWhenDown: true, spark: [6.1, 5.7, 5.2, 4.9, 4.4, 4.0, 3.8] },
];

export type AlertItem = {
  key: string;
  label: string;
  count: number;
  note: string;
  urgent?: string;
  icon: 'unassigned' | 'kyc' | 'incident' | 'ticket' | 'withdrawal';
  href: string;
};

export const alerts: AlertItem[] = [
  { key: 'unassigned', label: 'Đơn chưa gán tasker', count: 7, note: 'Chờ điều phối', urgent: '2 đơn cần xử lý trong 2 giờ', icon: 'unassigned', href: '/admin/bookings' },
  { key: 'kyc', label: 'Tasker chờ duyệt KYC', count: 12, note: 'Hồ sơ mới nộp', icon: 'kyc', href: '/admin/taskers/verification' },
  { key: 'incident', label: 'Sự cố đang mở', count: 4, note: 'Đang điều tra', urgent: '1 sự cố đã quá hạn', icon: 'incident', href: '/admin/incidents' },
  { key: 'ticket', label: 'Ticket hỗ trợ', count: 9, note: 'Trong hàng đợi', urgent: '2 ticket vượt SLA', icon: 'ticket', href: '/admin/support-tickets' },
  { key: 'withdrawal', label: 'Yêu cầu rút tiền', count: 5, note: 'Tổng 12.400.000₫', icon: 'withdrawal', href: '/admin/withdrawals' },
];

export type StatusSegment = { label: string; value: number; color: string };

export const statusSnapshot: StatusSegment[] = [
  { label: 'Hoàn tất', value: 412, color: '#0E9F6E' },
  { label: 'Đã nhận', value: 64, color: '#6366F1' },
  { label: 'Đang làm', value: 38, color: '#2563EB' },
  { label: 'Chờ nhận', value: 27, color: '#F59E0B' },
  { label: 'Đã huỷ', value: 19, color: '#E11D48' },
];

export type BookingStatus = 'completed' | 'in_progress' | 'confirmed' | 'posted' | 'cancelled';

export type RecentBooking = {
  id: string;
  customer: string;
  service: string;
  tasker: string | null;
  amount: number;
  status: BookingStatus;
  time: string;
};

export const recentBookings: RecentBooking[] = [
  { id: 'KS-7841', customer: 'Nguyễn Thu Hà', service: 'Tổng vệ sinh căn hộ', tasker: 'Trần Văn Minh', amount: 680_000, status: 'in_progress', time: '5 phút trước' },
  { id: 'KS-7840', customer: 'Lê Hoàng Nam', service: 'Dọn nhà theo giờ', tasker: 'Phạm Thị Lan', amount: 240_000, status: 'confirmed', time: '18 phút trước' },
  { id: 'KS-7839', customer: 'Đỗ Minh Quân', service: 'Vệ sinh sofa & nệm', tasker: null, amount: 450_000, status: 'posted', time: '32 phút trước' },
  { id: 'KS-7838', customer: 'Vũ Khánh Linh', service: 'Tổng vệ sinh văn phòng', tasker: 'Hoàng Anh Tú', amount: 1_250_000, status: 'completed', time: '1 giờ trước' },
  { id: 'KS-7837', customer: 'Bùi Thanh Tâm', service: 'Dọn nhà theo giờ', tasker: 'Ngô Thị Hương', amount: 320_000, status: 'completed', time: '2 giờ trước' },
  { id: 'KS-7836', customer: 'Phan Gia Bảo', service: 'Vệ sinh máy lạnh', tasker: 'Đặng Văn Phúc', amount: 360_000, status: 'cancelled', time: '3 giờ trước' },
];

export const statusMeta: Record<BookingStatus, { label: string; color: string; soft: string }> = {
  completed: { label: 'Hoàn tất', color: '#0E9F6E', soft: 'rgba(14,159,110,0.12)' },
  in_progress: { label: 'Đang làm', color: '#2563EB', soft: 'rgba(37,99,235,0.12)' },
  confirmed: { label: 'Đã nhận', color: '#6366F1', soft: 'rgba(99,102,241,0.12)' },
  posted: { label: 'Chờ nhận', color: '#D97706', soft: 'rgba(217,119,6,0.14)' },
  cancelled: { label: 'Đã huỷ', color: '#E11D48', soft: 'rgba(225,29,72,0.12)' },
};

export type TopTasker = { name: string; level: string; rating: number; jobs: number; initials: string };

export const topTaskers: TopTasker[] = [
  { name: 'Trần Văn Minh', level: 'Kim cương', rating: 4.97, jobs: 312, initials: 'TM' },
  { name: 'Phạm Thị Lan', level: 'Vàng', rating: 4.94, jobs: 287, initials: 'PL' },
  { name: 'Hoàng Anh Tú', level: 'Vàng', rating: 4.91, jobs: 264, initials: 'HT' },
  { name: 'Ngô Thị Hương', level: 'Bạc', rating: 4.88, jobs: 231, initials: 'NH' },
  { name: 'Đặng Văn Phúc', level: 'Bạc', rating: 4.85, jobs: 208, initials: 'ĐP' },
];

export type AreaPerf = { name: string; value: number };

export const areaPerf: AreaPerf[] = [
  { name: 'Quận 1', value: 148 },
  { name: 'Quận 3', value: 121 },
  { name: 'Bình Thạnh', value: 96 },
  { name: 'Thủ Đức', value: 74 },
  { name: 'Gò Vấp', value: 58 },
];
