import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerAddressApi } from "../services/address.service";
import type { UpsertCustomerAddressDto } from "../services/address.service";
import { toast } from "sonner";

export const ADDRESS_QUERY_KEYS = {
  list: ["customer", "addresses"],
};

/** Lấy danh sách địa chỉ */
export function useMyAddresses() {
  return useQuery({
    queryKey: ADDRESS_QUERY_KEYS.list,
    queryFn: () => customerAddressApi.findMyAddresses(),
    staleTime: 5 * 60 * 1000, // 5 phút
  });
}

/** Tạo địa chỉ mới */
export function useCreateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpsertCustomerAddressDto) => customerAddressApi.createMyAddress(dto),
    onSuccess: () => {
      toast.success("Thêm địa chỉ thành công!");
      void qc.invalidateQueries({ queryKey: ADDRESS_QUERY_KEYS.list });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Không thể thêm địa chỉ mới";
      toast.error(message);
    },
  });
}

/** Đặt địa chỉ mặc định */
export function useSetDefaultAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customerAddressApi.setMyDefaultAddress(id),
    onSuccess: () => {
      toast.success("Đã đặt địa chỉ mặc định");
      void qc.invalidateQueries({ queryKey: ADDRESS_QUERY_KEYS.list });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Không thể cài đặt địa chỉ mặc định";
      toast.error(message);
    },
  });
}
