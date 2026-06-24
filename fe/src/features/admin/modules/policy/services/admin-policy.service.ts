import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import {
  CreatePolicyPayload,
  Policy,
  UpdatePolicyPayload,
} from "../types/policy.type";

export const adminPolicyService = {
  async getPolicies(): Promise<Policy[]> {
    const response = await http.get(API_ENDPOINTS.ADMIN_POLICIES.BASE);
    return Array.isArray(response.data) ? response.data : response.data?.data ?? [];
  },

  async getPolicyById(id: string): Promise<Policy> {
    const response = await http.get(API_ENDPOINTS.ADMIN_POLICIES.DETAIL(id));
    return response.data?.data ?? response.data;
  },

  async createPolicy(payload: CreatePolicyPayload): Promise<Policy> {
    const response = await http.post(API_ENDPOINTS.ADMIN_POLICIES.BASE, payload);
    return response.data?.data ?? response.data;
  },

  async updatePolicy(id: string, payload: UpdatePolicyPayload): Promise<Policy> {
    const response = await http.patch(API_ENDPOINTS.ADMIN_POLICIES.DETAIL(id), payload);
    return response.data?.data ?? response.data;
  },

  async deletePolicy(id: string): Promise<{ message: string }> {
    const response = await http.delete(API_ENDPOINTS.ADMIN_POLICIES.DETAIL(id));
    return response.data;
  },
};