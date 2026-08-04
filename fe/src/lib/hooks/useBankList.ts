import { useQuery } from "@tanstack/react-query";
import http from "@/lib/api/http";

export interface VietQRBank {
  bin: string;
  shortName: string;
  name: string;
}

interface Wrapped<T> {
  success: boolean;
  data: T;
}

export function useBankList() {
  return useQuery({
    queryKey: ["wallet", "banks"],
    queryFn: () =>
      http
        .get<Wrapped<VietQRBank[]>>("/wallet/banks")
        .then((r) => r.data.data),
    staleTime: 60 * 60 * 1000, // 1 hour — mirrors server-side cache TTL
  });
}
