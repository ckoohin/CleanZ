import http from "@/lib/api/http";
import {
  CreatePolicyPayload,
  Policy,
  UpdatePolicyPayload,
} from "../types/policy.type";

export const adminPolicyService = {
  async getPolicies(): Promise<Policy[]> {
    const response = await http.get("/policy");
    return Array.isArray(response.data)
      ? response.data
      : response.data?.data ?? [];
  },

  async getPolicyById(id: string): Promise<Policy> {
    const response = await http.get(`/policy/${id}`);

    console.log("========== POLICY DETAIL RAW RESPONSE ==========");
    console.log(response);
    console.log("========== POLICY DETAIL RESPONSE.DATA ==========");
    console.log(response.data);
    console.log(
      "========== POLICY DETAIL RESPONSE.DATA STRING =========="
    );
    console.log(JSON.stringify(response.data, null, 2));

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