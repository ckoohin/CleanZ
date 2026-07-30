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

/** Mọi yêu cầu chụp/gửi ảnh từ policy check-in đều mở cùng một proof sheet. */
export function getCheckinProofReason(error: unknown): string | null {
  const message = extractCheckinErrorMessage(error);
  if (!message) return null;

  return /(?:chụp|gửi)\s+ảnh/i.test(message) ? message : null;
}
