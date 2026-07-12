import http from "@/lib/api/http";
import type {
  SystemConfigResponse,
  UpdateSystemConfigPayload,
} from "../types/system-config.types";

const BASE = "/system-config";

export const systemConfigApi = {
  get: (): Promise<SystemConfigResponse> =>
    http.get(BASE).then((response) => response.data.data),

  update: (values: UpdateSystemConfigPayload): Promise<SystemConfigResponse> =>
    http.put(BASE, { values }).then((response) => response.data.data),
};
