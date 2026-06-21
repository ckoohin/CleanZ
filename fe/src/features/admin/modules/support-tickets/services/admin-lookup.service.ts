import http from "@/lib/api/http";

/** Item tìm kiếm khách hàng (GET /admin/customers) — userId dùng cho reporterUserId. */
export interface CustomerLookupItem {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
}

/** Item tìm kiếm booking (GET /admin/bookings). */
export interface BookingLookupItem {
  id: string;
  bookingCode: string | null;
  customerName: string | null;
  status: string;
  scheduledStart: string | null;
}

interface Paginated<T> {
  data: T[];
}

export const adminLookupApi = {
  searchCustomers: (keyword: string): Promise<CustomerLookupItem[]> =>
    http
      .get<Paginated<CustomerLookupItem>>("/admin/customers", {
        params: { keyword, limit: 10 },
      })
      .then((r) => r.data.data),

  searchBookings: (keyword: string): Promise<BookingLookupItem[]> =>
    http
      .get<Paginated<BookingLookupItem>>("/admin/bookings", {
        params: { keyword, limit: 10 },
      })
      .then((r) => r.data.data),
};
