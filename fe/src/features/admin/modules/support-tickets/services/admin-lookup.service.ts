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

/** Item admin (GET /users?role=ADMIN). */
export interface AdminItem {
  id: string;
  fullName: string;
  email: string;
}

export const adminLookupApi = {
  listAdmins: (): Promise<AdminItem[]> =>
    http
      .get<unknown>("/users", {
        params: { role: "ADMIN", limit: 100, isActive: true },
      })
      .then((r) => {
        // Chấp nhận nhiều dạng vỏ: {success,data:{data:[]}} | {data:{data:[]}} | {data:[]} | []
        const body = r.data as Record<string, unknown> | unknown[];
        const lvl1 = Array.isArray(body) ? body : (body as Record<string, unknown>)?.data;
        const lvl2 = Array.isArray(lvl1) ? lvl1 : (lvl1 as Record<string, unknown>)?.data;
        const arr = Array.isArray(lvl2) ? lvl2 : Array.isArray(lvl1) ? lvl1 : [];
        return arr as AdminItem[];
      }),

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
