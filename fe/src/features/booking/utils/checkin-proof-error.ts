type CheckinErrorResponse = {
  response?: {
    data?: {
      message?: unknown;
    };
  };
};

export function extractCheckinErrorMessage(error: unknown): string | null {
  const message = (error as CheckinErrorResponse)?.response?.data?.message;

  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") {
    return message[0];
  }

  return null;
}

/**
 * Backend hiện có hai câu yêu cầu ảnh tùy việc thiết bị thiếu GPS hay đang ở
 * ngoài bán kính. Cả hai đều phải mở cùng một sheet chụp ảnh.
 */
export function getCheckinProofReason(error: unknown): string | null {
  const message = extractCheckinErrorMessage(error);
  if (!message) return null;

  return /(?:chụp ảnh[^.]{0,100}(?:xác minh|minh chứng)|ảnh minh chứng)/i.test(
    message,
  )
    ? message
    : null;
}
