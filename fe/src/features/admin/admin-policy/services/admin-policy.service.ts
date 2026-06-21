import http from "@/lib/api/http";
import {
  CreatePolicyPayload,
  Policy,
  UpdatePolicyPayload,
} from "../types/policy.type";

export const adminPolicyService = {
  async getPolicies(): Promise<Policy[]> {
    const response = await http.get("/policy");
    return Array.isArray(response.data) ? response.data : response.data?.data ?? [];
  },

  async getPolicyById(id: string): Promise<Policy> {
    const response = await http.get(`/policy/${id}`);
    return response.data?.data ?? response.data;
  },

  async createPolicy(payload: CreatePolicyPayload): Promise<Policy> {
    const response = await http.post("/policy", payload);
    return response.data?.data ?? response.data;
  },

  async updatePolicy(id: string, payload: UpdatePolicyPayload): Promise<Policy> {
    const response = await http.patch(`/policy/${id}`, payload);
    return response.data?.data ?? response.data;
  },

  async deletePolicy(id: string): Promise<{ message: string }> {
    const response = await http.delete(`/policy/${id}`);
    return response.data;
  },
};