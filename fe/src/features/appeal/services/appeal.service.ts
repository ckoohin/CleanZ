import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import type { AppealContext, SubmitAppealResult } from "../types";

const EP = API_ENDPOINTS.APPEALS;

export const appealApi = {
  verify: (token: string): Promise<AppealContext> =>
    http
      .get<AppealContext>(EP.VERIFY, {
        params: { token },
        skipErrorToast: true,
      } as Parameters<typeof http.get>[1])
      .then((r) => r.data),

  submit: (token: string, content: string): Promise<SubmitAppealResult> =>
    http
      .post<SubmitAppealResult>(EP.BASE, { token, content })
      .then((r) => r.data),
};
