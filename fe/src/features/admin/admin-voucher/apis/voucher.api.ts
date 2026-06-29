import { VoucherListQuery } from "../types/voucher.type";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function buildQuery(params: VoucherListQuery) {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  if (params.type) searchParams.set("type", params.type);
  if (params.isActive !== "" && params.isActive !== undefined && params.isActive !== null) {
    searchParams.set("isActive", String(params.isActive));
  }

  return searchParams.toString();
}

export async function getAdminVouchers(params: VoucherListQuery) {
  const queryString = buildQuery(params);

  // Nếu bạn đang lưu access token ở localStorage:
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

  const res = await fetch(`${API_URL}/admin/vouchers?${queryString}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include", // nếu backend dùng cookie thì vẫn support luôn
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || "Không thể tải danh sách voucher");
  }

  return data;
}