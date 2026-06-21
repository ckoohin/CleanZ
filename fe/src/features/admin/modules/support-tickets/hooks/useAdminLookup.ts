import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { adminLookupApi } from "../services/admin-lookup.service";

export function useCustomerLookup(keyword: string) {
  const kw = keyword.trim();
  return useQuery({
    queryKey: ["admin-lookup", "customers", kw],
    queryFn: () => adminLookupApi.searchCustomers(kw),
    enabled: kw.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

export function useAdminList() {
  return useQuery({
    queryKey: ["admin-lookup", "admins"],
    queryFn: adminLookupApi.listAdmins,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBookingLookup(keyword: string) {
  const kw = keyword.trim();
  return useQuery({
    queryKey: ["admin-lookup", "bookings", kw],
    queryFn: () => adminLookupApi.searchBookings(kw),
    enabled: kw.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}
