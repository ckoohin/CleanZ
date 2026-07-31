import http from "@/lib/api/http";
import type {
  SystemConfigResponse,
  UpdateSystemConfigPayload,
  OperationalPoliciesResponse,
  TaskerCancelPenaltyRule,
} from "../types/system-config.types";

const BASE = "/system-config";

export const systemConfigApi = {
  get: (): Promise<SystemConfigResponse> =>
    http.get(BASE).then((response) => response.data.data),

  update: (values: UpdateSystemConfigPayload): Promise<SystemConfigResponse> =>
    http.put(BASE, { values }).then((response) => response.data.data),

  getOperationalPolicies: (): Promise<OperationalPoliciesResponse> =>
    http.get(`${BASE}/operations`).then((response) => response.data.data),

  updateTaskerCancellation: (
    payload: {
      rules: TaskerCancelPenaltyRule[];
    },
  ) =>
    http
      .put(`${BASE}/operations/tasker-cancellation`, payload)
      .then((response) => response.data.data),

  updateCheckin: (
    payload: {
      openBeforeMinutes: number;
      autoApproveRadiusMeters: number;
    },
  ) =>
    http
      .put(`${BASE}/operations/checkin`, payload)
      .then((response) => response.data.data),

  updateCustomerScheduling: (
    payload: {
      minAdvanceMinutes: number;
      maxAdvanceDays: number;
    },
  ) =>
    http
      .put(`${BASE}/operations/customer-scheduling`, payload)
      .then((response) => response.data.data),
};
