import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import {
  CreatePolicyPayload,
  Policy,
  PolicyCategory,
  UpdatePolicyPayload,
} from "../types/policy.type";

const E = API_ENDPOINTS.ADMIN_POLICIES;

export const adminPolicyService = {
  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async getPolicies(category?: PolicyCategory): Promise<Policy[]> {
    const url = category ? `${E.BASE}?category=${category}` : E.BASE;
    const response = await http.get(url);
    return Array.isArray(response.data) ? response.data : response.data?.data ?? [];
  },

  async getPolicyById(id: string): Promise<Policy> {
    const response = await http.get(E.DETAIL(id));
    return response.data?.data ?? response.data;
  },

  async createPolicy(payload: CreatePolicyPayload): Promise<Policy> {
    const response = await http.post(E.BASE, payload);
    return response.data?.data ?? response.data;
  },

  async updatePolicy(id: string, payload: UpdatePolicyPayload): Promise<Policy> {
    const response = await http.patch(E.DETAIL(id), payload);
    return response.data?.data ?? response.data;
  },

  async deletePolicy(id: string): Promise<{ message: string }> {
    const response = await http.delete(E.DETAIL(id));
    return response.data;
  },

  // ─── Seed ──────────────────────────────────────────────────────────────────

  async seedDefaults(): Promise<{ created: number; skipped: number }> {
    const response = await http.post(E.SEED, {});
    return response.data?.data ?? response.data;
  },

  async getDefaults(): Promise<Policy[]> {
    const response = await http.get(E.DEFAULTS);
    return Array.isArray(response.data) ? response.data : response.data?.data ?? [];
  },

  // ─── Package Assignment ────────────────────────────────────────────────────

  async getPoliciesByPackage(packageId: string): Promise<Policy[]> {
    const response = await http.get(E.PACKAGE_POLICIES(packageId));
    return Array.isArray(response.data) ? response.data : response.data?.data ?? [];
  },

  async assignToPackage(packageId: string, policyIds: string[]): Promise<Policy[]> {
    const response = await http.post(E.ASSIGN_TO_PACKAGE(packageId), { policyIds });
    return Array.isArray(response.data) ? response.data : response.data?.data ?? [];
  },

  async removeFromPackage(packageId: string, policyId: string): Promise<Policy[]> {
    const response = await http.delete(E.REMOVE_FROM_PACKAGE(packageId, policyId));
    return Array.isArray(response.data) ? response.data : response.data?.data ?? [];
  },

  async applyDefaults(packageId: string): Promise<void> {
    await http.post(E.APPLY_DEFAULTS(packageId), {});
  },

  async getPackagesByPolicy(policyId: string): Promise<{ id: string; name: string; packageCode: string; isActive: boolean }[]> {
    const response = await http.get(E.PACKAGES_BY_POLICY(policyId));
    return Array.isArray(response.data) ? response.data : response.data?.data ?? [];
  },
};