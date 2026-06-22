import { API_ENDPOINTS } from "@/constants/api-endpoints";
import http from "@/lib/api/http";
import type {
  CustomerProfileResponse,
  UpdateCustomerProfileInput,
} from "../types/customer-profile.types";

const unwrap = <T>(response: { data: T | { data: T } }): T => {
  const body = response.data;
  return typeof body === "object" && body !== null && "data" in body
    ? (body as { data: T }).data
    : (body as T);
};

export const customerProfileApi = {
  update: (input: UpdateCustomerProfileInput): Promise<CustomerProfileResponse> => {
    const formData = new FormData();
    formData.append("fullName", input.fullName.trim());
    formData.append("phone", input.phone.trim());
    if (input.avatar) {
      formData.append("avatar", input.avatar);
    }

    return http
      .patch<CustomerProfileResponse>(
        API_ENDPOINTS.CUSTOMER.PROFILE,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      )
      .then(unwrap<CustomerProfileResponse>);
  },
};
