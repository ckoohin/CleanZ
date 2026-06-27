import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import type { AppealContext, SubmitAppealResult } from "../types";

const EP = API_ENDPOINTS.APPEALS;

export const appealApi = {
  /** Xác thực token & lấy thông tin hiển thị. Token sai/hết hạn → tự xử lý ở UI. */
  verify: (token: string): Promise<AppealContext> =>
    http
      .get<AppealContext>(EP.VERIFY, {
        params: { token },
        skipErrorToast: true,
      } as Parameters<typeof http.get>[1])
      .then((r) => r.data),

  /** Gửi nội dung kháng cáo (tạo ticket APPEAL). */
  submit: (token: string, content: string): Promise<SubmitAppealResult> =>
    http
      .post<SubmitAppealResult>(EP.BASE, { token, content })
      .then((r) => r.data),
};
