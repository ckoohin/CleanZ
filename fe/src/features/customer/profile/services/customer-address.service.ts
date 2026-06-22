import { API_ENDPOINTS } from "@/constants/api-endpoints";
import http from "@/lib/api/http";
import type {
  CreateCustomerAddressDto,
  CustomerAddress,
} from "../types/customer-address.types";
import { isHanoiAddress } from "@/lib/maps/hanoi-address";

const unwrap = <T>(response: { data: T | { data: T } }): T => {
  const body = response.data;
  return typeof body === "object" && body !== null && "data" in body
    ? (body as { data: T }).data
    : (body as T);
};

export const customerAddressApi = {
  findAll: (): Promise<CustomerAddress[]> =>
    http
      .get(API_ENDPOINTS.CUSTOMER.ADDRESSES)
      .then(unwrap<CustomerAddress[]>)
      .then((addresses) =>
        addresses.filter((address) =>
          isHanoiAddress(address.fullAddress, address.wardDetail),
        ),
      ),

  create: (dto: CreateCustomerAddressDto): Promise<CustomerAddress> =>
    http
      .post(API_ENDPOINTS.CUSTOMER.ADDRESSES, dto)
      .then(unwrap<CustomerAddress>),

  setDefault: (id: string): Promise<CustomerAddress> =>
    http
      .patch(API_ENDPOINTS.CUSTOMER.DEFAULT_ADDRESS(id))
      .then(unwrap<CustomerAddress>),
};
