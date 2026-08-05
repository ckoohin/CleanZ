const STATUS_MESSAGES: Partial<Record<number, string>> = {
  400: "Thông tin gửi lên không hợp lệ. Vui lòng kiểm tra lại.",
  401: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  403: "Bạn không có quyền thực hiện thao tác này.",
  404: "Không tìm thấy thông tin yêu cầu.",
  408: "Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.",
  409: "Dữ liệu đã thay đổi hoặc bị trùng. Vui lòng tải lại và thử lại.",
  413: "Dữ liệu tải lên vượt quá dung lượng cho phép.",
  422: "Thông tin gửi lên không hợp lệ. Vui lòng kiểm tra lại.",
  429: "Bạn thao tác quá nhanh. Vui lòng chờ một chút rồi thử lại.",
};

const DEFAULT_ERROR_MESSAGE = "Đã xảy ra lỗi. Vui lòng thử lại.";
const SERVER_ERROR_MESSAGE = "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.";
const NETWORK_ERROR_MESSAGE =
  "Mất kết nối Internet. Vui lòng kiểm tra lại Wi-Fi hoặc dữ liệu di động.";

const TECHNICAL_SUFFIX =
  /(?:[,|\-–—]\s*)?(?:Bad Request|Unauthorized|Forbidden|Not Found|Conflict|Unprocessable Entity|Internal Server Error|Service Unavailable)(?:\s*,?\s*\d{3})?\s*$/i;
const VIETNAMESE_TEXT = /[ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯàáâãèéêìíòóôõùúăđĩũơưẠ-ỹ]/;
const TECHNICAL_KEYS = new Set([
  "error",
  "status",
  "statusCode",
  "path",
  "timestamp",
  "stack",
  "name",
  "code",
]);

type ApiErrorLike = {
  code?: string;
  response?: {
    status?: number;
    data?: unknown;
  };
};

/**
 * Dịch ngược body lỗi dạng Blob về JSON, ngay trên chính đối tượng lỗi.
 *
 * Các request tải file dùng `responseType: 'blob'`, và axios áp kiểu đó cho CẢ
 * response lỗi — nên khi backend trả 4xx/5xx kèm JSON, `error.response.data`
 * vẫn là một `Blob`. `getApiErrorMessage` không đọc được Blob nên message thật
 * của server bị nuốt, người dùng chỉ còn nhận câu chung theo mã HTTP.
 *
 * Gọi một lần ở interceptor để mọi luồng tải file (dashboard, báo cáo gói dịch
 * vụ, phiếu hỗ trợ) cùng được, thay vì bắt từng nút tự xử lý.
 */
export async function unwrapBlobError(error: unknown): Promise<void> {
  const response = (error as ApiErrorLike)?.response;
  const data: unknown = response?.data;

  // Kiểm tra `typeof Blob` trước: module này cũng được nạp khi Next render phía
  // server, nơi `Blob` có thể không tồn tại.
  if (typeof Blob === "undefined" || !(data instanceof Blob)) return;
  if (!data.type.includes("json")) return;

  try {
    response!.data = JSON.parse(await data.text());
  } catch {
    // Không phải JSON hợp lệ thì để nguyên — getApiErrorMessage vẫn rơi về câu
    // mặc định theo mã HTTP, đúng như hành vi trước đây.
  }
}

function extractMessages(value: unknown, depth = 0): string[] {
  if (depth > 5 || value == null) return [];
  if (typeof value === "string") return [value];

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractMessages(item, depth + 1));
  }

  if (typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  if (record.message != null) {
    return extractMessages(record.message, depth + 1);
  }
  if (record.errors != null) {
    return extractMessages(record.errors, depth + 1);
  }

  return Object.entries(record).flatMap(([key, item]) =>
    TECHNICAL_KEYS.has(key) ? [] : extractMessages(item, depth + 1),
  );
}

function cleanUserMessage(message: string): string | null {
  const cleaned = message.replace(TECHNICAL_SUFFIX, "").trim();
  if (!cleaned || !VIETNAMESE_TEXT.test(cleaned)) return null;
  return cleaned;
}

/**
 * Chuyển mọi lỗi API thành một câu tiếng Việt an toàn để hiển thị cho người
 * dùng. Không trả status text, mã HTTP, stack trace hoặc message kỹ thuật.
 */
export function getApiErrorMessage(error: unknown, fallback?: string): string {
  const apiError = error as ApiErrorLike;
  const status = apiError?.response?.status;

  if (!apiError?.response) {
    const localMessage =
      error instanceof Error ? cleanUserMessage(error.message) : null;
    if (localMessage) return localMessage;

    const isOnline =
      typeof window === "undefined" ? true : window.navigator.onLine;
    return !isOnline ? NETWORK_ERROR_MESSAGE : SERVER_ERROR_MESSAGE;
  }

  if (status != null && status >= 500) return SERVER_ERROR_MESSAGE;

  const messages = extractMessages(apiError.response.data)
    .map(cleanUserMessage)
    .filter((message): message is string => Boolean(message));
  const uniqueMessages = [...new Set(messages)];

  if (uniqueMessages.length > 0) return uniqueMessages.join("; ");
  if (status === 401) return STATUS_MESSAGES[401]!;

  return (
    fallback ||
    (status != null ? STATUS_MESSAGES[status] : undefined) ||
    DEFAULT_ERROR_MESSAGE
  );
}
