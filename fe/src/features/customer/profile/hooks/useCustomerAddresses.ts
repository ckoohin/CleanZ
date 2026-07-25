import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { customerAddressApi } from "../services/customer-address.service";
import type { CreateCustomerAddressDto } from "../types/customer-address.types";

const ADDRESS_QUERY_KEY = ["customer", "addresses"] as const;

export function useCustomerAddresses() {
  return useQuery({
    queryKey: ADDRESS_QUERY_KEY,
    queryFn: customerAddressApi.findAll,
  });
}

export function useCreateCustomerAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateCustomerAddressDto) =>
      customerAddressApi.create(dto),
    onSuccess: () => {
      toast.success("Đã thêm địa chỉ mới");
      void queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEY });
    },
  });
}

export function useSetDefaultCustomerAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customerAddressApi.setDefault(id),
    onSuccess: () => {
      toast.success("Đã cập nhật địa chỉ mặc định");
      void queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEY });
    },
  });
}
